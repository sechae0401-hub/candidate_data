import { ApiError, withApiHandler } from "@/lib/api-handler";
import { getSupabaseServerClient } from "@/shared/supabase/server";

export async function GET(_request: Request, { params }: { params: { sessionId: string } }) {
  return withApiHandler(
    async () => {
      if (!params.sessionId) {
        throw new ApiError("결과 조회 세션이 올바르지 않습니다.", 400);
      }

      const supabase = getSupabaseServerClient();
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", params.sessionId)
        .single();

      if (sessionError || !session) {
        console.error("Result session query failed:", sessionError);
        throw new ApiError("분류 세션을 찾지 못했습니다.", 404);
      }

      const { data: results, error: resultsError } = await supabase
        .from("classification_results")
        .select("*")
        .eq("session_id", params.sessionId)
        .order("row_index", { ascending: true });

      if (resultsError) {
        console.error("Classification results query failed:", resultsError);
        throw new ApiError("분류 결과를 조회하지 못했습니다.", 500);
      }

      const { data: newCategories, error: categoriesError } = await supabase
        .from("new_categories")
        .select("*")
        .eq("session_id", params.sessionId);

      if (categoriesError) {
        console.error("New categories query failed:", categoriesError);
        throw new ApiError("신규 카테고리를 조회하지 못했습니다.", 500);
      }

      return {
        session,
        results: results ?? [],
        newCategories: newCategories ?? [],
      };
    },
    {
      defaultErrorMessage: "분류 결과 조회 중 오류가 발생했습니다.",
    },
  );
}
