import { z } from "zod";

import { ApiError, withApiHandler } from "@/lib/api-handler";
import { getSupabaseServerClient } from "@/shared/supabase/server";

const UpdateSessionStatusSchema = z.object({
  status: z.enum(["cancelled"]),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(
    async () => {
      const rawBody: unknown = await request.json();
      const parsed = UpdateSessionStatusSchema.safeParse(rawBody);

      if (!parsed.success || !params.id) {
        throw new ApiError("세션 업데이트 요청 형식이 올바르지 않습니다.", 400);
      }

      const supabase = getSupabaseServerClient();
      const { error } = await supabase
        .from("sessions")
        .update({
          status: parsed.data.status,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", params.id);

      if (error) {
        console.error("Session status update failed:", error);
        throw new ApiError("세션 상태를 업데이트하지 못했습니다.", 500);
      }

      return {
        sessionId: params.id,
        status: parsed.data.status,
      };
    },
    {
      defaultErrorMessage: "세션 상태 변경 중 오류가 발생했습니다.",
    },
  );
}
