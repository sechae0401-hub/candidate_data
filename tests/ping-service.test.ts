import test from "node:test";
import assert from "node:assert/strict";

import { ApiError } from "../src/lib/api-handler";
import { runSupabasePing } from "../src/shared/monitoring/ping";

test("runSupabasePing returns ok after a lightweight sessions query", async () => {
  const result = await runSupabasePing({
    from: () => ({
      select: () => ({
        limit: async () => ({ error: null }),
      }),
    }),
  });

  assert.deepEqual(result, { status: "ok", table: "sessions" });
});

test("runSupabasePing wraps query failures as ApiError", async () => {
  await assert.rejects(
    () =>
      runSupabasePing({
        from: () => ({
          select: () => ({
            limit: async () => ({ error: { message: "boom" } }),
          }),
        }),
      }),
    (error) => error instanceof ApiError && error.message === "데이터 처리 중 오류가 발생했습니다.",
  );
});
