import { z } from "zod";

import { ApiError } from "@/lib/api-handler";

export const FIRST_COHORT_COMPARISON_NOTICE = "첫 기수입니다. 다음 기수부터 이전 기수와 비교됩니다.";

export interface CauseResultSource {
  primaryCause: string | null;
  needsReview?: boolean;
}

export interface PreviousCohortResults {
  sessionId: string;
  results: Array<{ primaryCause: string | null }>;
}

export interface PrimaryCauseShare {
  primaryCause: string;
  count: number;
  percentage: number;
}

export interface SecondaryActionShare {
  secondaryAction: string;
  count: number;
  percentage: number;
}

export interface CompetingCourseShare {
  courseName: string;
  count: number;
  respondentPercentage: number;
}

export interface CohortComparisonItem {
  primaryCause: string;
  currentPercentage: number;
  previousAveragePercentage: number;
  deltaPercentagePoints: number;
}

export interface CohortComparison {
  notice: string | null;
  comparisons: CohortComparisonItem[];
}

const InsightResponseSchema = z.object({
  summary: z.string().trim().min(1),
  recommendedActions: z.array(z.string().trim().min(1)).min(1).max(3),
});

export type GeneratedInsight = z.infer<typeof InsightResponseSchema>;

function normalizePrimaryCause(primaryCause: string | null) {
  const normalized = primaryCause?.trim();

  return normalized && normalized.length > 0 ? normalized : "미분류";
}

function calculatePercentage(count: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

export function calculateTopPrimaryCauseShares(results: CauseResultSource[], limit = 3): PrimaryCauseShare[] {
  const counts = new Map<string, number>();

  for (const result of results) {
    const primaryCause = normalizePrimaryCause(result.primaryCause);
    counts.set(primaryCause, (counts.get(primaryCause) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([primaryCause, count]) => ({
      primaryCause,
      count,
      percentage: calculatePercentage(count, results.length),
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, limit);
}

function calculateCausePercentageInCohort(results: Array<{ primaryCause: string | null }>, primaryCause: string) {
  if (results.length === 0) {
    return 0;
  }

  const count = results.filter((result) => normalizePrimaryCause(result.primaryCause) === primaryCause).length;

  return (count / results.length) * 100;
}

export function calculateTopSecondaryActionShares(
  results: Array<{ secondaryAction: string | null }>,
  limit = 5,
): SecondaryActionShare[] {
  const counts = new Map<string, number>();

  for (const result of results) {
    const action = result.secondaryAction?.trim();
    if (action && action.length > 0) {
      counts.set(action, (counts.get(action) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([secondaryAction, count]) => ({
      secondaryAction,
      count,
      percentage: calculatePercentage(count, results.length),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function calculateCompetingCourseShares(
  results: Array<{ competingCourse: string | null }>,
): CompetingCourseShare[] {
  const answered = results.filter((r) => {
    const c = r.competingCourse?.trim();
    return c && c.length > 0;
  });

  if (answered.length === 0) return [];

  const counts = new Map<string, number>();

  for (const r of answered) {
    const course = r.competingCourse!.trim();
    counts.set(course, (counts.get(course) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([courseName, count]) => ({
      courseName,
      count,
      respondentPercentage: calculatePercentage(count, answered.length),
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildCohortComparisons(
  topPrimaryCauses: PrimaryCauseShare[],
  previousCohorts: PreviousCohortResults[],
): CohortComparison {
  if (previousCohorts.length === 0) {
    return {
      notice: FIRST_COHORT_COMPARISON_NOTICE,
      comparisons: [],
    };
  }

  const comparisons = topPrimaryCauses.map<CohortComparisonItem>((currentCause) => {
    const previousAverage =
      previousCohorts.reduce(
        (total, cohort) => total + calculateCausePercentageInCohort(cohort.results, currentCause.primaryCause),
        0,
      ) / previousCohorts.length;
    const previousAveragePercentage = Math.round(previousAverage);

    return {
      primaryCause: currentCause.primaryCause,
      currentPercentage: currentCause.percentage,
      previousAveragePercentage,
      deltaPercentagePoints: currentCause.percentage - previousAveragePercentage,
    };
  });

  return {
    notice: null,
    comparisons,
  };
}

export function buildInsightPrompt({
  topPrimaryCauses,
  cohortComparison,
}: {
  topPrimaryCauses: PrimaryCauseShare[];
  cohortComparison: CohortComparison;
}) {
  return [
    "취소 사유 분석 결과를 운영팀이 바로 이해할 수 있게 요약하세요.",
    "주요 패턴을 한 단락으로 설명하고, 운영팀을 위한 구체적인 개선 제안을 1~3개 생성하세요.",
    "각 제안은 반드시 '원인(비율) + 구체적 액션' 형식으로 작성하세요.",
    "반드시 JSON만 응답하세요. 마크다운 코드블록은 쓰지 마세요.",
    JSON.stringify(
      {
        responseShape: {
          summary: "주요 패턴 한 단락",
          recommendedActions: ["내일배움카드 이슈(41%)가 가장 높습니다. 신청 시점 카드 발급 안내를 강화하세요."],
        },
        topPrimaryCauses,
        cohortComparison,
      },
      null,
      2,
    ),
  ].join("\n");
}

export function parseInsightResponse(response: { output_text?: string | null }) {
  if (!response.output_text) {
    throw new ApiError("AI 인사이트 결과를 읽지 못했습니다.", 502);
  }

  try {
    const parsed: unknown = JSON.parse(response.output_text);
    const direct = InsightResponseSchema.safeParse(parsed);
    if (direct.success) return direct.data;

    // some models wrap the result in a responseShape key
    const wrapped = InsightResponseSchema.safeParse(
      (parsed as Record<string, unknown>).responseShape,
    );
    if (wrapped.success) return wrapped.data;

    console.error("Invalid insight JSON output:", parsed);
    throw new ApiError("AI 인사이트 결과 형식이 올바르지 않습니다.", 502);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Invalid insight JSON output:", error);
    throw new ApiError("AI 인사이트 결과 형식이 올바르지 않습니다.", 502);
  }
}

export function buildStoredInsightSummary({
  insight,
  topPrimaryCauses,
  topSecondaryActions,
  competingCourses,
  cohortComparison,
}: {
  insight: GeneratedInsight;
  topPrimaryCauses: PrimaryCauseShare[];
  topSecondaryActions: SecondaryActionShare[];
  competingCourses: CompetingCourseShare[];
  cohortComparison: CohortComparison;
}) {
  return JSON.stringify({
    summary: insight.summary,
    recommendedActions: insight.recommendedActions,
    topPrimaryCauses,
    topSecondaryActions,
    competingCourses,
    cohortComparison,
  });
}
