import { z } from "zod";

import { ApiError, withApiHandler } from "@/lib/api-handler";
import { runOpenAiJsonRequest } from "@/lib/gpt-client";
import { getSupabaseServerClient } from "@/shared/supabase/server";
import {
  buildCohortComparisons,
  buildInsightPrompt,
  buildStoredInsightSummary,
  calculateTopPrimaryCauseShares,
  parseInsightResponse,
  type PreviousCohortResults,
} from "@/classify/insight-summary";

const InsightRequestSchema = z.object({
  sessionId: z.string().min(1),
});

interface ClassificationResultRecord {
  session_id: string;
  primary_cause: string | null;
  needs_review: boolean;
}

interface PreviousSessionRecord {
  id: string;
}

function groupPreviousResultsBySession(results: ClassificationResultRecord[]) {
  const grouped = new Map<string, Array<{ primaryCause: string | null }>>();

  for (const result of results) {
    const currentRows = grouped.get(result.session_id) ?? [];
    currentRows.push({ primaryCause: result.primary_cause });
    grouped.set(result.session_id, currentRows);
  }

  return [...grouped.entries()].map<PreviousCohortResults>(([sessionId, rows]) => ({
    sessionId,
    results: rows,
  }));
}

export async function POST(request: Request) {
  return withApiHandler(
    async () => {
      const rawBody: unknown = await request.json();
      const parsed = InsightRequestSchema.safeParse(rawBody);

      if (!parsed.success) {
        throw new ApiError("인사이트 요청 형식이 올바르지 않습니다.", 400);
      }

      const supabase = getSupabaseServerClient();
      const { data: currentResultsData, error: currentResultsError } = await supabase
        .from("classification_results")
        .select("session_id, primary_cause, needs_review")
        .eq("session_id", parsed.data.sessionId);

      if (currentResultsError) {
        console.error("Current classification results query failed:", currentResultsError);
        throw new ApiError("분류 결과를 조회하지 못했습니다.", 500);
      }

      const currentResults = (currentResultsData ?? []) as ClassificationResultRecord[];

      if (currentResults.length === 0) {
        throw new ApiError("인사이트를 생성할 분류 결과가 없습니다.", 400);
      }

      const { data: previousSessionsData, error: previousSessionsError } = await supabase
        .from("sessions")
        .select("id")
        .eq("status", "completed")
        .neq("id", parsed.data.sessionId);

      if (previousSessionsError) {
        console.error("Previous sessions query failed:", previousSessionsError);
        throw new ApiError("이전 기수 데이터를 조회하지 못했습니다.", 500);
      }

      const previousSessionIds = ((previousSessionsData ?? []) as PreviousSessionRecord[]).map((session) => session.id);
      let previousCohorts: PreviousCohortResults[] = [];

      if (previousSessionIds.length > 0) {
        const { data: previousResultsData, error: previousResultsError } = await supabase
          .from("classification_results")
          .select("session_id, primary_cause, needs_review")
          .in("session_id", previousSessionIds);

        if (previousResultsError) {
          console.error("Previous classification results query failed:", previousResultsError);
          throw new ApiError("이전 기수 분류 결과를 조회하지 못했습니다.", 500);
        }

        previousCohorts = groupPreviousResultsBySession((previousResultsData ?? []) as ClassificationResultRecord[]);
      }

      const topPrimaryCauses = calculateTopPrimaryCauseShares(
        currentResults.map((result) => ({
          primaryCause: result.primary_cause,
          needsReview: result.needs_review,
        })),
      );
      const cohortComparison = buildCohortComparisons(topPrimaryCauses, previousCohorts);
      const insight = parseInsightResponse(
        await runOpenAiJsonRequest(
          buildInsightPrompt({
            topPrimaryCauses,
            cohortComparison,
          }),
        ),
      );
      const storedInsight = buildStoredInsightSummary({
        insight,
        topPrimaryCauses,
        cohortComparison,
      });

      const { error: updateError } = await supabase
        .from("sessions")
        .update({
          insight_summary: storedInsight,
          status: "completed",
          analyzed_at: new Date().toISOString(),
        } as never)
        .eq("id", parsed.data.sessionId);

      if (updateError) {
        console.error("Session insight update failed:", updateError);
        throw new ApiError("인사이트 결과를 저장하지 못했습니다.", 500);
      }

      return {
        summary: insight.summary,
        recommendedActions: insight.recommendedActions,
        topPrimaryCauses,
        cohortComparison,
      };
    },
    {
      defaultErrorMessage: "인사이트 생성 중 오류가 발생했습니다.",
    },
  );
}
