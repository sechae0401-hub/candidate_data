export type ResultReviewState = "review" | "done";

export interface ResultRowSummary {
  id: string;
  rowIndex: number;
  interviewContent: string | null;
  notes: string | null;
  primaryCause: string | null;
  secondaryAction: string | null;
  detailTags: string | null;
  competingCourse: string | null;
  reasoning: string | null;
  needsReview: boolean;
  reviewCompleted: boolean;
}

export interface ResultSummaryCounts {
  totalCount: number;
  reviewCount: number;
  completedCount: number;
}

export function getResultReviewState(row: Pick<ResultRowSummary, "needsReview" | "reviewCompleted">): ResultReviewState {
  return row.needsReview && !row.reviewCompleted ? "review" : "done";
}

export function calculateResultSummary(rows: Array<Pick<ResultRowSummary, "needsReview" | "reviewCompleted">>): ResultSummaryCounts {
  const reviewCount = rows.filter((row) => getResultReviewState(row) === "review").length;

  return {
    totalCount: rows.length,
    reviewCount,
    completedCount: rows.length - reviewCount,
  };
}

export function buildInterviewSummary(
  row: Pick<ResultRowSummary, "interviewContent" | "notes">,
  maxLength = 64,
) {
  const sourceText = row.interviewContent?.trim() || row.notes?.trim() || "원문 없음";

  if (sourceText.length <= maxLength) {
    return sourceText;
  }

  return `${sourceText.slice(0, maxLength)}...`;
}
