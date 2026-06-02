import { z } from "zod";

import {
  getResultReviewState,
  type ResultRowSummary,
  type ResultSummaryCounts,
} from "@/result/result-summary";

const CohortComparisonItemSchema = z.object({
  primaryCause: z.string(),
  currentPercentage: z.number(),
  previousAveragePercentage: z.number(),
  deltaPercentagePoints: z.number(),
});

const StoredInsightSummarySchema = z.object({
  summary: z.string().trim().min(1),
  recommendedActions: z.array(z.string().trim().min(1)).default([]),
  topPrimaryCauses: z
    .array(
      z.object({
        primaryCause: z.string(),
        count: z.number(),
        percentage: z.number(),
      }),
    )
    .default([]),
  topSecondaryActions: z
    .array(
      z.object({
        secondaryAction: z.string(),
        count: z.number(),
        percentage: z.number(),
      }),
    )
    .default([]),
  competingCourses: z
    .array(
      z.object({
        courseName: z.string(),
        count: z.number(),
        respondentPercentage: z.number(),
      }),
    )
    .default([]),
  cohortComparison: z
    .object({
      notice: z.string().nullable(),
      comparisons: z.array(CohortComparisonItemSchema),
    })
    .default({
      notice: "이전 기수 비교 데이터가 없습니다.",
      comparisons: [],
    }),
});

export type StoredInsightSummary = z.infer<typeof StoredInsightSummarySchema>;

export interface NewCategoryDisplayItem {
  categoryName: string;
  occurrenceCount: number;
}

export const FALLBACK_INSIGHT_SUMMARY: StoredInsightSummary = {
  summary: "인사이트 요약을 불러오지 못했습니다.",
  recommendedActions: [],
  topPrimaryCauses: [],
  topSecondaryActions: [],
  competingCourses: [],
  cohortComparison: {
    notice: "이전 기수 비교 데이터가 없습니다.",
    comparisons: [],
  },
};

function escapeMarkdownCell(value: string | null) {
  return (value?.trim() || "-").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function parseStoredInsightSummary(value: string | null): StoredInsightSummary {
  if (!value) {
    return FALLBACK_INSIGHT_SUMMARY;
  }

  try {
    return StoredInsightSummarySchema.parse(JSON.parse(value));
  } catch {
    return FALLBACK_INSIGHT_SUMMARY;
  }
}

export function canCopyToNotion(summary: ResultSummaryCounts) {
  return summary.totalCount > 0 && summary.reviewCount === 0;
}

export function buildNewCategorySummary(categories: NewCategoryDisplayItem[]) {
  if (categories.length === 0) {
    return null;
  }

  return `이번 분류에서 새로 만들어진 카테고리: ${categories
    .map((category) => `${category.categoryName} (${category.occurrenceCount}건)`)
    .join(", ")}`;
}

function buildComparisonMarkdown(insight: StoredInsightSummary) {
  if (insight.cohortComparison.notice) {
    return insight.cohortComparison.notice;
  }

  if (insight.cohortComparison.comparisons.length === 0) {
    return "이전 기수 비교 데이터가 없습니다.";
  }

  return insight.cohortComparison.comparisons
    .map((item) => {
      const signedDelta = item.deltaPercentagePoints > 0 ? `+${item.deltaPercentagePoints}` : `${item.deltaPercentagePoints}`;

      return `- ${item.primaryCause}: 이번 기수 ${item.currentPercentage}% → 이전 평균 ${item.previousAveragePercentage}% (${signedDelta}%p)`;
    })
    .join("\n");
}

export function buildNotionMarkdown({
  rows,
  insight,
  cohortName,
}: {
  rows: ResultRowSummary[];
  insight: StoredInsightSummary;
  cohortName: string | null;
}) {
  const title = cohortName?.trim() ? `취소 사유 분석 결과 - ${cohortName.trim()}` : "취소 사유 분석 결과";
  const actions = insight.recommendedActions.length
    ? insight.recommendedActions.map((action, index) => `${index + 1}. ${action}`).join("\n")
    : "추천 액션이 없습니다.";
  const tableRows = rows
    .map((row) =>
      [
        row.rowIndex,
        escapeMarkdownCell(row.primaryCause),
        escapeMarkdownCell(row.secondaryAction),
        escapeMarkdownCell(row.detailTags),
        getResultReviewState(row) === "review" ? "검토 필요" : "완료",
        escapeMarkdownCell(row.reasoning),
      ].join(" | "),
    )
    .map((row) => `| ${row} |`)
    .join("\n");

  return [
    `# ${title}`,
    "",
    "## 인사이트 요약",
    insight.summary,
    "",
    "## 운영 추천 액션",
    actions,
    "",
    "## 이전 기수 비교",
    buildComparisonMarkdown(insight),
    "",
    "## 분류 결과",
    "| 행 | 1차 원인 | 2차 행동 | 세부 태그 | 검토 여부 | 판단 근거 |",
    "| --- | --- | --- | --- | --- | --- |",
    tableRows,
  ].join("\n");
}
