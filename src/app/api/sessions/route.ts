import { ApiError, withApiHandler } from "@/lib/api-handler";
import { getSupabaseServerClient } from "@/shared/supabase/server";
import { buildSessionInsertPayload, type CreateSessionRequest } from "@/upload/session-start";

export async function POST(request: Request) {
  return withApiHandler(
    async () => {
      const body = (await request.json()) as CreateSessionRequest;
      const payload = buildSessionInsertPayload(body);
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("sessions")
        .insert([payload] as unknown as never)
        .select("id");
      const sessionRows = data as Array<{ id: string }> | null;
      const sessionId = sessionRows?.[0]?.id;

      if (error || !sessionId) {
        console.error("Session insert failed:", error);
        throw new ApiError("분류 세션을 만들지 못했습니다.", 500);
      }

      return {
        sessionId,
      };
    },
    {
      defaultErrorMessage: "분류 시작 준비 중 오류가 발생했습니다.",
    },
  );
}
