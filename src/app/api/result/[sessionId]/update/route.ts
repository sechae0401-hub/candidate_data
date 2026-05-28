import { ApiError, withApiHandler } from "@/lib/api-handler";
import { ResultUpdateRequestSchema } from "@/result/result-update";
import { getSupabaseServerClient } from "@/shared/supabase/server";

function buildDatabaseUpdatePayload(parsed: ReturnType<typeof ResultUpdateRequestSchema.parse>) {
  const payload: Record<string, string | boolean | null> = {};

  if (parsed.primaryCause !== undefined) {
    payload.primary_cause = parsed.primaryCause;
  }

  if (parsed.secondaryAction !== undefined) {
    payload.secondary_action = parsed.secondaryAction;
  }

  if (parsed.detailTags !== undefined) {
    payload.detail_tags = parsed.detailTags;
  }

  if (parsed.needsReview !== undefined) {
    payload.needs_review = parsed.needsReview;
    payload.review_completed = !parsed.needsReview;
  }

  return payload;
}

export async function PATCH(request: Request, { params }: { params: { sessionId: string } }) {
  return withApiHandler(
    async () => {
      if (!params.sessionId) {
        throw new ApiError("결과 수정 세션이 올바르지 않습니다.", 400);
      }

      const rawBody: unknown = await request.json();
      const parsed = ResultUpdateRequestSchema.safeParse(rawBody);

      if (!parsed.success) {
        throw new ApiError("결과 수정 요청 형식이 올바르지 않습니다.", 400);
      }

      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("classification_results")
        .update(buildDatabaseUpdatePayload(parsed.data) as never)
        .eq("id", parsed.data.resultId)
        .eq("session_id", params.sessionId)
        .select("id")
        .single();

      if (error || !data) {
        console.error("Classification result update failed:", error);
        throw new ApiError("수정 내용을 저장하지 못했습니다.", 500);
      }

      return {
        resultId: parsed.data.resultId,
      };
    },
    {
      defaultErrorMessage: "수정 내용 저장 중 오류가 발생했습니다.",
    },
  );
}
