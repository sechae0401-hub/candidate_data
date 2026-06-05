import { z } from "zod";

import { ApiError, withApiHandler } from "@/lib/api-handler";
import { runAiJsonRequest } from "@/lib/gpt-client";
import { getSupabaseServerClient } from "@/shared/supabase/server";
import {
  buildInflowBreakdown,
  buildStageBreakdown,
  type DashboardRow,
} from "@/result/dashboard-insights";
import {
  buildSegmentInsightPrompt,
  parseSegmentInsightResponse,
  selectSegmentsForInsight,
} from "@/result/dashboard-insight-ai";

const DashboardInsightRequestSchema = z.object({
  sessionId: z.string().min(1),
  tab: z.enum(["inflow", "stage"]),
});

interface DashboardResultRecord {
  primary_cause: string | null;
  source_snapshot: Record<string, unknown> | null;
}

const TAB_LABELS: Record<"inflow" | "stage", string> = {
  inflow: "유입경로별",
  stage: "단계별",
};

export async function POST(request: Request) {
  return withApiHandler(
    async () => {
      const rawBody: unknown = await request.json();
      const parsed = DashboardInsightRequestSchema.safeParse(rawBody);

      if (!parsed.success) {
        throw new ApiError("인사이트 요청 형식이 올바르지 않습니다.", 400);
      }

      const supabase = getSupabaseServerClient();
      const { data: resultsData, error: resultsError } = await supabase
        .from("classification_results")
        .select("primary_cause, source_snapshot")
        .eq("session_id", parsed.data.sessionId);

      if (resultsError) {
        console.error("Dashboard insight results query failed:", resultsError);
        throw new ApiError("분류 결과를 조회하지 못했습니다.", 500);
      }

      const records = (resultsData ?? []) as DashboardResultRecord[];

      if (records.length === 0) {
        throw new ApiError("인사이트를 생성할 분류 결과가 없습니다.", 400);
      }

      const rows: DashboardRow[] = records.map((record) => ({
        primaryCause: record.primary_cause,
        source: record.source_snapshot,
      }));

      const breakdown =
        parsed.data.tab === "inflow" ? buildInflowBreakdown(rows) : buildStageBreakdown(rows);
      const segments = selectSegmentsForInsight(breakdown);

      if (segments.length === 0) {
        throw new ApiError("해석할 세그먼트가 없습니다.", 400);
      }

      const insights = parseSegmentInsightResponse(
        await runAiJsonRequest(buildSegmentInsightPrompt(TAB_LABELS[parsed.data.tab], segments)),
      );

      return { insights };
    },
    {
      defaultErrorMessage: "인사이트 생성 중 오류가 발생했습니다.",
    },
  );
}
