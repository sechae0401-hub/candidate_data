import { z } from "zod";

import { ApiError } from "@/lib/api-handler";
import type { Database } from "@/shared/types/database.types";

const ROW_RETRY_DELAY_MS = 1500;
const PROMPT_TEXT_MAX_LENGTH = 2000;
const PROMPT_TEXT_HEAD_LENGTH = 1200;
const PROMPT_TRUNCATION_SUFFIX = "...[truncated]";
const PROMPT_SOURCE_CONTEXT_VALUE_MAX_LENGTH = 200;
const PROMPT_SOURCE_CONTEXT_COLUMNS = ["유입경로", "최종기수", "합격자등록"] as const;
const FAILED_CLASSIFICATION_PRIMARY_CAUSE = "분류 실패";

export const ClassifyRowSchema = z.object({
  rowIndex: z.number().int().positive(),
  interviewContent: z.string(),
  notes: z.string(),
  resultValue: z.string(),
  source: z.record(z.string(), z.string()),
});

export const ClassifyRequestSchema = z.object({
  sessionId: z.string().min(1),
  rows: z.array(ClassifyRowSchema).min(1).max(5),
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
type PromptRow = Pick<ClassifyRow, "rowIndex" | "interviewContent" | "notes" | "resultValue"> & {
  sourceContext?: Record<string, string>;
};

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
    primaryCause: FAILED_CLASSIFICATION_PRIMARY_CAUSE,
    secondaryAction: "검토 필요",
    detailTags: "API 오류",
    competingCourse: null,
    reasoning: "GPT 분류 호출이 실패해 검토 필요로 처리했습니다.",
    needsReview: true,
  };
}

function normalizeSourceColumnName(name: string) {
  return name.replace(/\s+/g, "").trim().toLowerCase();
}

function truncatePromptText(value: string, maxLength = PROMPT_TEXT_MAX_LENGTH) {
  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  if (maxLength <= PROMPT_TRUNCATION_SUFFIX.length) {
    return normalized.slice(0, maxLength);
  }

  const headLength = Math.min(PROMPT_TEXT_HEAD_LENGTH, maxLength - PROMPT_TRUNCATION_SUFFIX.length);
  const tailLength = maxLength - headLength - PROMPT_TRUNCATION_SUFFIX.length;
  const tail = tailLength > 0 ? normalized.slice(-tailLength) : "";

  return `${normalized.slice(0, headLength)}${PROMPT_TRUNCATION_SUFFIX}${tail}`;
}

function readSourceContext(row: ClassifyRow): Record<string, string> | undefined {
  const sourceEntries = Object.entries(row.source);
  const context: Record<string, string> = {};

  for (const columnName of PROMPT_SOURCE_CONTEXT_COLUMNS) {
    const target = normalizeSourceColumnName(columnName);
    const sourceEntry = sourceEntries.find(([key]) => normalizeSourceColumnName(key) === target);
    const sourceValue = sourceEntry?.[1]?.trim();

    if (sourceValue) {
      context[columnName] = truncatePromptText(sourceValue, PROMPT_SOURCE_CONTEXT_VALUE_MAX_LENGTH);
    }
  }

  return Object.keys(context).length > 0 ? context : undefined;
}

function buildPromptRows(rows: ClassifyRow[]): PromptRow[] {
  return rows.map((row) => ({
    rowIndex: row.rowIndex,
    interviewContent: truncatePromptText(row.interviewContent),
    notes: truncatePromptText(row.notes),
    resultValue: row.resultValue,
    sourceContext: readSourceContext(row),
  }));
}

export function buildClassificationPrompt(rows: ClassifyRow[]) {
  const promptRows = buildPromptRows(rows);

  return [
    "취소 대상 행을 분류하세요. 특이사항(notes)을 인터뷰 내용보다 우선하고, 가장 최신 notes 기록을 우선하세요.",
    "primaryCause(1차 원인)는 취소의 실질적 이유입니다. '신청자 요청/개인 사유/취소 요청/본인 희망/자진 취소'는 쓰지 마세요.",
    "권장 primaryCause: 일정 충돌, 직장·학업 병행 불가, 타 과정 신청, 타 과정 신청 (추정), 취업·합격, 건강 문제, 내일배움카드 이슈, 비용 부담, 개인 사정, KDT 수강이력, 커리큘럼.",
    "타 과정 언급이 취소 이유로 직접 명시되면 '타 과정 신청', 인터뷰에만 언급되고 취소 이유가 불명확하면 '타 과정 신청 (추정)' 및 needsReview true.",
    "직장·학교 때문에 평일 오프라인 참여가 구조적으로 어렵다면 '일정 충돌'이 아니라 '직장·학업 병행 불가'.",
    "secondaryAction은 아래 7개 중 하나만 사용하세요: 재지원 의향, 타 과정 결과 대기, 타 과정 합격 확정, 취업·진학 전념, 완전 이탈, 연락 두절, 향후 계획 미확인.",
    "타 과정 합격/수강이 확정이면 '타 과정 합격 확정', 결과를 기다리거나 알아보는 단계면 '타 과정 결과 대기'. 연락 안 됨/미회신/부재중 반복은 '연락 두절'.",
    "sourceContext는 원본 엑셀에서 추린 보조 맥락입니다. 유입경로·최종기수·합격자등록은 필요한 경우 판단 근거에만 보조적으로 반영하세요.",
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
              reasoning: "특이사항에 SSAFY 지원 후 결과를 기다린다고 명시됨",
              needsReview: false,
            },
          ],
          newCategories: [{ categoryName: "새 카테고리", occurrenceCount: 1 }],
        },
        rows: promptRows,
      },
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

async function classifyNonEmptyRowsOnce(rows: ClassifyRow[], runOpenAi: OpenAiJsonRunner) {
  const prompt = buildClassificationPrompt(rows);
  const parsed = parseClassificationResponse(await runOpenAi(prompt));
  validateResultRowIndices(rows, parsed);
  return parsed;
}

async function classifyNonEmptyRowsWithRetry(rows: ClassifyRow[], runOpenAi: OpenAiJsonRunner, sleep: Sleep) {
  try {
    return await classifyNonEmptyRowsOnce(rows, runOpenAi);
  } catch (firstError) {
    console.warn("Classification row-layer retry scheduled:", firstError);
    await sleep(ROW_RETRY_DELAY_MS);
    return classifyNonEmptyRowsOnce(rows, runOpenAi);
  }
}

async function classifySplitBatchesAfterFailure(rows: ClassifyRow[], runOpenAi: OpenAiJsonRunner) {
  if (rows.length <= 1) {
    return {
      failedCount: rows.length,
      newCategories: [] as NewCategory[],
      results: rows.map(buildFailedClassificationResult),
    };
  }

  console.warn("Classification split retry scheduled", {
    rowCount: rows.length,
    rowIndices: rows.map((row) => row.rowIndex),
  });

  const midpoint = Math.ceil(rows.length / 2);
  const chunks = [rows.slice(0, midpoint), rows.slice(midpoint)].filter((chunk) => chunk.length > 0);
  const results: ClassificationResult[] = [];
  const newCategories: NewCategory[] = [];
  let failedCount = 0;

  for (const chunk of chunks) {
    try {
      const classified = await classifyNonEmptyRowsOnce(chunk, runOpenAi);
      results.push(...classified.results);
      newCategories.push(...classified.newCategories);
    } catch (error) {
      console.error("Classification split retry failed:", error);
      failedCount += chunk.length;
      results.push(...chunk.map(buildFailedClassificationResult));
    }
  }

  return { failedCount, newCategories, results };
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
  let failedCount = 0;

  if (gptRows.length > 0) {
    try {
      const classified = await classifyNonEmptyRowsWithRetry(gptRows, runOpenAi, sleep);
      gptResults = classified.results;
      newCategories = classified.newCategories;
    } catch (error) {
      console.error("Classification batch failed after row-layer retry:", error);
      const recovered = await classifySplitBatchesAfterFailure(gptRows, runOpenAi);
      gptResults = recovered.results;
      newCategories = recovered.newCategories;
      failedCount = recovered.failedCount;
    }
  }

  const results = [...autoResults, ...gptResults].sort((left, right) => left.rowIndex - right.rowIndex);
  const reviewCount = results.filter((result) => result.needsReview).length;

  return {
    processedCount: results.length,
    reviewCount,
    failedCount,
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
