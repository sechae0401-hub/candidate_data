import { ApiError } from "@/lib/api-handler";

interface PingClient {
  from: (table: "sessions") => {
    select: (
      columns?: string,
      options?: { count?: string; head?: boolean },
    ) => {
      limit: (count: number) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
}

export async function runSupabasePing(client: PingClient) {
  const { error } = await client.from("sessions").select("id").limit(1);

  if (error) {
    throw new ApiError("데이터 처리 중 오류가 발생했습니다.", 500);
  }

  return {
    status: "ok",
    table: "sessions",
  };
}
