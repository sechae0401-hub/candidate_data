import { test, expect } from "@playwright/test";

test.describe("API 헬스체크", () => {
  test("GET /api/health 가 200 ok를 반환한다", async ({ request }) => {
    const response = await request.get("/api/health");

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  test("GET /api/ping 가 200을 반환한다", async ({ request }) => {
    const response = await request.get("/api/ping");

    expect(response.status()).toBe(200);
  });
});
