import { z } from "zod";

import { ApiError } from "@/lib/api-handler";
import type { Database } from "@/shared/types/database.types";

const ROW_RETRY_DELAY_MS = 1500;

export const ClassifyRowSchema = z.object({
  rowIndex: z.number().int().positive(),
  interviewContent: z.string(),
  notes: z.string(),
  resultValue: z.string(),
  source: z.record(z.string(), z.string()),
});

export const ClassifyRequestSchema = z.object({
  sessionId: z.string().min(1),
  rows: z.array(ClassifyRowSchema).min(1).max(3),
});

export const ClassificationResultSchema = z.object({
  rowIndex: z.number().int().positive(),
  primaryCause: z.string().min(1),
  secondaryAction: z.string().min(1),
  detailTags: z.string(),
  competingCourse: z.string().nullable(),
  reasoning: z.string().min(1),
  needsReview: z.boolean(),
});

export const NewCategorySchema = z.object({
  categoryName: z.string().trim().min(1),
  occurrenceCount: z.number().int().positive(),
});

const ClassificationResponseSchema = z.object({
  results: z.array(ClassificationResultSchema).min(1),
  newCategories: z.array(NewCategorySchema).default([]),
});

export type ClassifyRow = z.infer<typeof ClassifyRowSchema>;
export type ClassifyRequest = z.infer<typeof ClassifyRequestSchema>;
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;
export type NewCategory = z.infer<typeof NewCategorySchema>;

type OpenAiJsonRunner = (input: string) => Promise<{ output_text?: string | null }>;
type Sleep = (milliseconds: number) => Promise<unknown>;

function defaultSleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function hasNoSourceContent(row: ClassifyRow) {
  return row.interviewContent.trim() === "" && row.notes.trim() === "";
}

function buildInsufficientInfoResult(row: ClassifyRow): ClassificationResult {
  return {
    rowIndex: row.rowIndex,
    primaryCause: "정보 부족",
    secondaryAction: "검토 필요",
    detailTags: "정보 부족",
    competingCourse: null,
    reasoning: "인터뷰내용과 특이사항이 모두 비어 있어 자동 분류할 수 없습니다.",
    needsReview: true,
  };
}

function buildFailedClassificationResult(row: ClassifyRow): ClassificationResult {
  return {
    rowIndex: row.rowIndex,
    primaryCause: "분류 실패",
    secondaryAction: "검토 필요",
    detailTags: "API 오류",
    competingCourse: null,
    reasoning: "GPT 분류 호출이 실패해 검토 필요로 처리했습니다.",
    needsReview: true,
  };
}

export function buildClassificationPrompt(rows: ClassifyRow[]) {
  return [
    "취소 사유 분석기에서 취소 대상 행을 분류합니다.",
    "각 행에 대해 1차 원인, 향후 향방, 세부 태그, 타 과정명, 판단 근거, 검토 필요 여부를 판단하세요.",
    "",
    "## 1차 원인 작성 규칙 (반드시 준수)",
    "1차 원인은 취소의 실질적·근본적 이유여야 합니다.",
    "신청자가 '어떤 행동을 했는지'가 아니라 '왜 취소하려는지'를 기재하세요.",
    "",
    "### 정보 우선순위 — 특이사항을 인터뷰 내용보다 먼저 참고하세요",
    "특이사항(notes)에 취소 사유가 직접 기재된 경우, 인터뷰 내용보다 특이사항을 우선하여 1차 원인을 결정하세요.",
    "특이사항의 가장 최신 날짜 기록(맨 위)이 실제 취소 결정과 가장 관련이 높습니다.",
    "예: 특이사항에 '시간이 되지 않아서 취소'라고 명시된 경우 → 1차 원인은 '일정 충돌' (인터뷰에 SSAFY 신청 내용이 있어도 무시)",
    "",
    "### 절대 사용 금지 표현 — 아래는 이유가 아닌 행동 설명이므로 1차 원인으로 쓰지 마세요",
    "신청자 요청 / 개인 사유 / 취소 요청 / 본인 희망 / 자진 취소",
    "",
    "### 권장 1차 원인 카테고리 (실제 데이터 기반, 해당 없으면 newCategories에 추가)",
    "- 일정 충돌: 이번 기수에는 업무·학업 일정과 겹치지만, 다음 기수·다른 시간대라면 참여 가능할 수 있는 '일시적' 충돌",
    "- 직장·학업 병행 불가: 직장·학교 등 본업이 있어 오프라인·주간 과정 특성상 참여 자체가 구조적으로 불가능한 경우(다음 기수에도 동일하게 불가). 일시적인 '일정 충돌'과 반드시 구분",
    "- 타 과정 신청: 특이사항에 타 과정(SSAFY·SKALA·데이터분석 등)이 취소 이유로 명시된 경우",
    "- 타 과정 신청 (추정): 인터뷰에서 타 과정 신청 언급은 있으나, 취소 이유로 직접 명시되지 않은 경우. 이 경우 needsReview를 반드시 true로 설정",
    "- 취업·합격: 인턴·취업·면접 합격으로 과정 참여가 불가한 경우",
    "- 건강 문제: 본인 또는 가족의 건강 이슈",
    "- 내일배움카드 이슈: 카드 미발급·한도 부족·발급 지연",
    "- 비용 부담: 자비부담금 확인 후 부담을 느끼는 경우",
    "- 개인 사정: 이사·가족 돌봄 등 기타 생활상의 이유",
    "- KDT 수강이력: 과거 KDT(국비지원) 과정 수강 이력이 있어 중복 수강이 불가한 경우",
    "- 커리큘럼: 과정 분야·내용·난이도가 본인과 맞지 않거나, 더 알아본 뒤 결정하려는 경우",
    "",
    "### 잘못된 예 vs 올바른 예",
    "나쁜 예: primaryCause '신청자 요청' → 왜 요청했는지 알 수 없어 운영에 도움이 안 됨",
    "나쁜 예: 특이사항에 '시간이 되지 않아 취소'라고 적혔는데 primaryCause '타 과정 신청' → 특이사항 무시",
    "좋은 예: 특이사항에 '시간이 되지 않아 취소' → primaryCause '일정 충돌', needsReview false",
    "좋은 예: 특이사항에 'SSAFY 신청으로 합격 취소 요청' → primaryCause '타 과정 신청', needsReview false",
    "좋은 예: 인터뷰에 SSAFY 신청 언급만 있고 취소 이유 불명 → primaryCause '타 과정 신청 (추정)', needsReview true",
    "",
    "## 향후 향방(secondaryAction) 작성 규칙 (반드시 준수)",
    "secondaryAction은 '운영자가 할 일'이 아니라, 이 신청자가 취소 후 '어디로 향하는지(향방)'입니다. 다시 올 의향(예: 재지원)부터 완전히 떠난 상태(예: 완전 이탈, 취업)까지 모두 포함합니다.",
    "인터뷰·특이사항에 단서가 드러나면 그에 맞게 기재하고, 단서가 없으면 '향후 계획 미확인'으로 둡니다.",
    "### 향후 향방 카테고리 — 반드시 아래 7개 중 하나로만 작성 (자유 기재 금지)",
    "- 재지원 의향: 우리 과정에 다음 기수·다른 일정으로 다시 지원하겠다는 의향이 보이는 경우",
    "- 타 과정 결과 대기: 타 과정(SSAFY·SKALA 등)에 지원했으나 아직 합격·확정 전이라 결과를 기다리는 경우",
    "- 타 과정 합격 확정: 타 과정에 이미 합격·확정됐거나, 이미 타 교육을 수강 중인 경우",
    "- 취업·진학 전념: 취업·입사·학업 등으로 교육 대신 다른 길을 확정한 경우",
    "- 완전 이탈: 본인이 교육을 포기한다고 밝혔고 추가 계획이 보이지 않는 경우",
    "- 연락 두절: 특이사항·인터뷰에 연락 안 됨·미회신·부재중 등으로 더 이상 의사 확인이 어려운 경우(이미 여러 번 연락 시도한 상태)",
    "- 향후 계획 미확인: 연락은 되지만 향후 행동을 알 수 있는 단서가 없는 경우",
    "중요: '타 과정 결과 대기'(아직 합격 전)와 '타 과정 합격 확정'(이미 합격)을 반드시 구분하세요. 합격 여부가 불명확하면 '타 과정 결과 대기'로 둡니다. 단 '타 교육 수강', '이미 다른 과정에 다니는 중' 등 이미 타 과정을 시작한 정황이면 '타 과정 합격 확정'으로 봅니다.",
    "중요: 연락이 닿지 않거나 미회신·부재중이면 '향후 계획 미확인'이 아니라 '연락 두절'로 분류하세요. 특히 미회신·무응답 기록이 여러 번 반복되면 반드시 '연락 두절'입니다.",
    "",
    "### 분류 예시 (실제 패턴 기반 — 경계 케이스)",
    "예시1) 특이사항 'AI 개발이 목표가 아니라 다른 부트캠프를 수강하려 합격 취소. 통화 중 전화를 한 번 끊었으나 이후 문자로 안내함' → primaryCause '커리큘럼', secondaryAction '타 과정 결과 대기', competingCourse null, needsReview false. (분야가 본인 목표와 안 맞는다는 판단이 핵심 원인이므로 커리큘럼. 다른 부트캠프는 아직 '하려는' 단계라 결과 대기. 전화를 한 번 끊은 것만으로는 연락 두절이 아님)",
    "예시2) 특이사항 '클라우드 과정에 관심이 생겨 합격 취소. 개발·클라우드 둘 다 배우고 싶지만 KDT 제약 때문에 고민 중이며 클라우드는 추후 KDT로 들으려 생각 중' → primaryCause '타 과정 신청', secondaryAction '타 과정 결과 대기', competingCourse '클라우드 과정', needsReview false. (다른 과정을 알아보고 고민하는 단계일 뿐 합격·확정이 아니므로 '타 과정 합격 확정'이 아니라 '타 과정 결과 대기')",
    "예시3) 특이사항 '교육 과정을 못 따라갈 것 같다며 취소 요청. 다만 이전 기수부터 계속 고민해 왔고 현재도 수강 여부를 고민 중이라 다음 날 다시 연락 예정' → primaryCause '커리큘럼', secondaryAction '재지원 의향', competingCourse null, needsReview false. (막연한 '못 따라가겠다'는 불안은 추가 상담으로 해소 가능한 커리큘럼 이슈. 아직 수강을 고민 중이므로 재지원 의향)",
    "예시4) 특이사항 '직장인이라 평일 오프라인 과정에 참석할 수 없어 취소' 또는 '재학 중이라 학교 일정상 오프라인 과정을 다닐 수 없어 취소' → primaryCause '직장·학업 병행 불가', secondaryAction '향후 계획 미확인', competingCourse null, needsReview false. (오프라인 과정 특성상 직장·학업 병행이 구조적으로 불가능하고 다음 기수에도 동일하게 불가하므로, 일시적 '일정 충돌'이 아니라 '직장·학업 병행 불가'이며 자연이탈)",
    "",
    "기존 카테고리로 설명하기 어려운 사유가 있으면 newCategories에 categoryName과 occurrenceCount를 포함하세요.",
    "반드시 JSON만 응답하세요. 마크다운 코드블록은 쓰지 마세요.",
    JSON.stringify(
      {
        responseShape: {
          results: [
            {
              rowIndex: 2,
              primaryCause: "타 과정 신청",
              secondaryAction: "타 과정 결과 대기",
              detailTags: "SSAFY 지원, 합격 발표 전",
              competingCourse: "SSAFY",
              reasoning: "특이사항에 SSAFY 지원 후 결과를 기다린다고 명시됨. 아직 합격 전이므로 '타 과정 결과 대기'",
              needsReview: false,
            },
            {
              rowIndex: 5,
              primaryCause: "일정 충돌",
              secondaryAction: "향후 계획 미확인",
              detailTags: "시간 부족",
              competingCourse: null,
              reasoning: "특이사항에 시간이 되지 않아 취소라고 직접 명시됨. 인터뷰의 타 과정 언급은 보조 정보로만 참고",
              needsReview: false,
            },
          ],
          newCategories: [{ categoryName: "새 카테고리", occurrenceCount: 1 }],
        },
        rows,
      },
      null,
      2,
    ),
  ].join("\n");
}

export function parseClassificationResponse(response: { output_text?: string | null }) {
  if (!response.output_text) {
    throw new ApiError("AI 분류 결과를 읽지 못했습니다.", 502);
  }

  try {
    const parsed: unknown = JSON.parse(response.output_text);
    const direct = ClassificationResponseSchema.safeParse(parsed);
    if (direct.success) return direct.data;

    // some models wrap the result in a responseShape key
    const wrapped = ClassificationResponseSchema.safeParse(
      (parsed as Record<string, unknown>).responseShape,
    );
    if (wrapped.success) return wrapped.data;

    console.error("Invalid classification JSON output:", parsed);
    throw new ApiError("AI 분류 결과 형식이 올바르지 않습니다.", 502);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Invalid classification JSON output:", error);
    throw new ApiError("AI 분류 결과 형식이 올바르지 않습니다.", 502);
  }
}

function validateResultRowIndices(
  rows: ClassifyRow[],
  parsed: ReturnType<typeof parseClassificationResponse>,
): void {
  const inputIndices = new Set(rows.map((row) => row.rowIndex));
  const allMatch = parsed.results.every((result) => inputIndices.has(result.rowIndex));

  if (!allMatch || parsed.results.length !== rows.length) {
    console.error("GPT returned mismatched rowIndex values", {
      input: [...inputIndices],
      returned: parsed.results.map((r) => r.rowIndex),
    });
    throw new ApiError("AI 분류 결과의 행 인덱스가 입력과 일치하지 않습니다.", 502);
  }
}

async function classifyNonEmptyRowsWithRetry(rows: ClassifyRow[], runOpenAi: OpenAiJsonRunner, sleep: Sleep) {
  try {
    const parsed = parseClassificationResponse(await runOpenAi(buildClassificationPrompt(rows)));
    validateResultRowIndices(rows, parsed);
    return parsed;
  } catch (firstError) {
    console.warn("Classification row-layer retry scheduled:", firstError);
    await sleep(ROW_RETRY_DELAY_MS);
    const parsed = parseClassificationResponse(await runOpenAi(buildClassificationPrompt(rows)));
    validateResultRowIndices(rows, parsed);
    return parsed;
  }
}

export async function classifyRows(
  request: ClassifyRequest,
  runOpenAi: OpenAiJsonRunner = async () => {
    throw new ApiError("AI 분류 실행기가 설정되지 않았습니다.", 500);
  },
  sleep: Sleep = defaultSleep,
) {
  const parsedRequest = ClassifyRequestSchema.safeParse(request);

  if (!parsedRequest.success) {
    throw new ApiError("분류 요청 형식이 올바르지 않습니다.", 400);
  }

  const autoResults = parsedRequest.data.rows.filter(hasNoSourceContent).map(buildInsufficientInfoResult);
  const gptRows = parsedRequest.data.rows.filter((row) => !hasNoSourceContent(row));
  let gptResults: ClassificationResult[] = [];
  let newCategories: NewCategory[] = [];

  if (gptRows.length > 0) {
    try {
      const classified = await classifyNonEmptyRowsWithRetry(gptRows, runOpenAi, sleep);
      gptResults = classified.results;
      newCategories = classified.newCategories;
    } catch (error) {
      console.error("Classification batch failed after row-layer retry:", error);
      gptResults = gptRows.map(buildFailedClassificationResult);
    }
  }

  const results = [...autoResults, ...gptResults].sort((left, right) => left.rowIndex - right.rowIndex);
  const reviewCount = results.filter((result) => result.needsReview).length;

  return {
    processedCount: results.length,
    reviewCount,
    results,
    newCategories,
  };
}

export function buildClassificationResultInsertPayloads(
  sessionId: string,
  results: ClassificationResult[],
  rows: ClassifyRow[] = [],
): Database["public"]["Tables"]["classification_results"]["Insert"][] {
  const rowsByIndex = new Map(rows.map((row) => [row.rowIndex, row]));

  return results.map((result) => ({
    session_id: sessionId,
    row_index: result.rowIndex,
    interview_content: rowsByIndex.get(result.rowIndex)?.interviewContent ?? null,
    notes: rowsByIndex.get(result.rowIndex)?.notes ?? null,
    source_snapshot: rowsByIndex.get(result.rowIndex)?.source ?? null,
    primary_cause: result.primaryCause,
    secondary_action: result.secondaryAction,
    detail_tags: result.detailTags,
    competing_course: result.competingCourse,
    reasoning: result.reasoning,
    needs_review: result.needsReview,
    review_completed: !result.needsReview,
  }));
}

export function buildNewCategoryInsertPayloads(
  sessionId: string,
  newCategories: NewCategory[],
): Database["public"]["Tables"]["new_categories"]["Insert"][] {
  const categoryCounts = new Map<string, number>();

  for (const category of newCategories) {
    const categoryName = category.categoryName.trim();
    categoryCounts.set(categoryName, (categoryCounts.get(categoryName) ?? 0) + category.occurrenceCount);
  }

  return [...categoryCounts.entries()].map(([categoryName, occurrenceCount]) => ({
    session_id: sessionId,
    category_name: categoryName,
    occurrence_count: occurrenceCount,
  }));
}
