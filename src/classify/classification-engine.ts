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
    "각 행에 대해 1차 원인, 2차 행동, 세부 태그, 타 과정명, 판단 근거, 검토 필요 여부를 판단하세요.",
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
    "- 일정 충돌: 업무·학업 일정과 겹치거나 시간을 내기 어려운 경우",
    "- 타 과정 신청: 특이사항에 타 과정(SSAFY·SKALA·데이터분석 등)이 취소 이유로 명시된 경우",
    "- 타 과정 신청 (추정): 인터뷰에서 타 과정 신청 언급은 있으나, 취소 이유로 직접 명시되지 않은 경우. 이 경우 needsReview를 반드시 true로 설정",
    "- 취업·합격: 인턴·취업·면접 합격으로 과정 참여가 불가한 경우",
    "- 건강 문제: 본인 또는 가족의 건강 이슈",
    "- 내일배움카드 이슈: 카드 미발급·한도 부족·발급 지연",
    "- 비용 부담: 자비부담금 확인 후 부담을 느끼는 경우",
    "- 개인 사정: 이사·가족 돌봄 등 기타 생활상의 이유",
    "",
    "### 잘못된 예 vs 올바른 예",
    "나쁜 예: primaryCause '신청자 요청' → 왜 요청했는지 알 수 없어 운영에 도움이 안 됨",
    "나쁜 예: 특이사항에 '시간이 되지 않아 취소'라고 적혔는데 primaryCause '타 과정 신청' → 특이사항 무시",
    "좋은 예: 특이사항에 '시간이 되지 않아 취소' → primaryCause '일정 충돌', needsReview false",
    "좋은 예: 특이사항에 'SSAFY 신청으로 합격 취소 요청' → primaryCause '타 과정 신청', needsReview false",
    "좋은 예: 인터뷰에 SSAFY 신청 언급만 있고 취소 이유 불명 → primaryCause '타 과정 신청 (추정)', needsReview true",
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
              secondaryAction: "대기 등록 안내",
              detailTags: "SSAFY 신청",
              competingCourse: "SSAFY",
              reasoning: "특이사항에 SSAFY 신청으로 합격 취소 요청이라고 직접 명시됨",
              needsReview: false,
            },
            {
              rowIndex: 5,
              primaryCause: "일정 충돌",
              secondaryAction: "일정 재조율 안내",
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
