import { withApiHandler } from "@/lib/api-handler";
import { runSupabasePing } from "@/shared/monitoring/ping";
import { getSupabaseServerClient } from "@/shared/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiHandler(() => runSupabasePing(getSupabaseServerClient()), {
    defaultErrorMessage: "데이터 처리 중 오류가 발생했습니다.",
  });
}
