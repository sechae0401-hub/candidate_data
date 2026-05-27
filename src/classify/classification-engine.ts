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
    "기존 카테고리로 설명하기 어려운 사유가 있으면 newCategories에 categoryName과 occurrenceCount를 포함하세요.",
    "반드시 JSON만 응답하세요. 마크다운 코드블록은 쓰지 마세요.",
    JSON.stringify(
      {
        responseShape: {
          results: [
            {
              rowIndex: 2,
              primaryCause: "내일배움카드 이슈",
              secondaryAction: "카드 발급 안내",
              detailTags: "발급 지연",
              competingCourse: null,
              reasoning: "판단 근거 한 문장",
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
    return ClassificationResponseSchema.parse(JSON.parse(response.output_text));
  } catch (error) {
    console.error("Invalid classification JSON output:", error);
    throw new ApiError("AI 분류 결과 형식이 올바르지 않습니다.", 502);
  }
}

async function classifyNonEmptyRowsWithRetry(rows: ClassifyRow[], runOpenAi: OpenAiJsonRunner, sleep: Sleep) {
  try {
    return parseClassificationResponse(await runOpenAi(buildClassificationPrompt(rows)));
  } catch (firstError) {
    console.warn("Classification row-layer retry scheduled:", firstError);
    await sleep(ROW_RETRY_DELAY_MS);
    return parseClassificationResponse(await runOpenAi(buildClassificationPrompt(rows)));
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
): Database["public"]["Tables"]["classification_results"]["Insert"][] {
  return results.map((result) => ({
    session_id: sessionId,
    row_index: result.rowIndex,
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
