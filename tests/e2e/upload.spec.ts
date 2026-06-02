import { test, expect } from "@playwright/test";
import path from "path";

test.describe("업로드 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/upload");
  });

  test("페이지 제목과 헤더가 표시된다", async ({ page }) => {
    await expect(page.getByText("취소사유분석기")).toBeVisible();
    await expect(page.getByText("업로드부터 결과 검토까지 한 흐름으로 이어지는 내부 분석 도구")).toBeVisible();
  });

  test("루트 경로가 /upload로 리다이렉트된다", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/upload/);
  });

  test("단계 내비게이션이 표시된다", async ({ page }) => {
    await expect(page.getByRole("navigation", { name: "단계 진행" })).toBeVisible();
    await expect(page.getByText("업로드")).toBeVisible();
    await expect(page.getByText("분류")).toBeVisible();
    await expect(page.getByText("결과")).toBeVisible();
  });

  test("양식 다운로드 링크가 올바른 href를 가진다", async ({ page }) => {
    const downloadLink = page.getByRole("link", { name: /양식 다운로드|템플릿 다운로드|다운로드/ });
    await expect(downloadLink).toHaveAttribute("href", /cancellation-template\.xlsx/);
  });

  test("파일 업로드 영역이 표시된다", async ({ page }) => {
    const uploadArea = page.locator("input[type='file']");
    await expect(uploadArea).toBeAttached();
  });

  test("xlsx가 아닌 파일을 업로드하면 에러 메시지가 표시된다", async ({ page }) => {
    const fileInput = page.locator("input[type='file']");

    await fileInput.setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an excel file"),
    });

    await expect(page.getByText(/xlsx|엑셀|파일 형식/i)).toBeVisible();
  });

  test("올바른 양식 파일을 업로드하면 파일명이 표시된다", async ({ page }) => {
    const fileInput = page.locator("input[type='file']");
    const templatePath = path.resolve(
      __dirname,
      "../../public/templates/cancellation-template.xlsx",
    );

    await fileInput.setInputFiles(templatePath);

    await expect(page.getByText("cancellation-template.xlsx")).toBeVisible();
  });
});
