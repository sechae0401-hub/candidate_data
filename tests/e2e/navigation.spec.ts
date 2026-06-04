import { test, expect } from "@playwright/test";

test.describe("내비게이션 및 세션 보호", () => {
  test("/result 는 세션 없이 접근하면 /upload로 리다이렉트된다", async ({ page }) => {
    await page.goto("/result");
    await expect(page).toHaveURL(/\/upload/);
  });

  test("/analyzing 는 세션 없이 접근하면 /upload로 리다이렉트된다", async ({ page }) => {
    await page.goto("/analyzing");
    await expect(page).toHaveURL(/\/upload/);
  });

  test("헤더의 '취소사유분석기' 링크가 /upload로 이동한다", async ({ page }) => {
    await page.goto("/upload");
    await page.getByRole("link", { name: "취소사유분석기" }).click();
    await expect(page).toHaveURL(/\/upload/);
  });
});
