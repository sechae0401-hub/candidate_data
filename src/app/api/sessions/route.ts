import { ApiError, withApiHandler } from "@/lib/api-handler";
import { getSupabaseServerClient } from "@/shared/supabase/server";
import { buildSessionInsertPayload, CreateSessionRequestSchema } from "@/upload/session-start";

export async function POST(request: Request) {
  return withApiHandler(
    async () => {
      const rawBody: unknown = await request.json();
      const parsed = CreateSessionRequestSchema.safeParse(rawBody);

      if (!parsed.success) {
        throw new ApiError("세션 요청 형식이 올바르지 않습니다.", 400);
      }

      const payload = buildSessionInsertPayload(parsed.data);
      const supabase = getSupabaseServerClient();
      // supabase-js v2 singleton 타입 추론 한계로 insert 타입이 never[]로 추론됨 — as never로 최소 회피
      const { data, error } = await supabase
        .from("sessions")
        .insert(payload as never)
        .select("id");
      const sessionId = (data as Array<{ id: string }> | null)?.[0]?.id;

      if (error || !sessionId) {
        console.error("Session insert failed:", error);
        throw new ApiError("분류 세션을 만들지 못했습니다.", 500);
      }

      return { sessionId };
    },
    {
      defaultErrorMessage: "분류 시작 준비 중 오류가 발생했습니다.",
    },
  );
}
