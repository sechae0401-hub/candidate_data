import test from "node:test";
import assert from "node:assert/strict";

import { ApiError, createErrorResponse, withApiHandler } from "../src/lib/api-handler";

test("createErrorResponse returns a stable error payload", async () => {
  const response = createErrorResponse("실패했습니다", 422);

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: "실패했습니다" });
});

test("withApiHandler serializes successful payloads", async () => {
  const response = await withApiHandler(async () => ({ ok: true }), { successStatus: 201 });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true });
});

test("withApiHandler preserves ApiError status and message", async () => {
  const response = await withApiHandler(async () => {
    throw new ApiError("잘못된 요청입니다", 400);
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "잘못된 요청입니다" });
});

test("withApiHandler hides unknown internal errors", async () => {
  const response = await withApiHandler(async () => {
    throw new Error("database exploded");
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "데이터 처리 중 오류가 발생했습니다." });
});
