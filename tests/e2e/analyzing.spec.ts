import { test, expect } from "@playwright/test";

const SESSION_ID = "test-session-analyzing";
const DRAFT = {
  sessionId: SESSION_ID,
  cohortName: "26기",
  rows: [
    { rowIndex: 1, interviewContent: "비용이 너무 비쌌어요", notes: "" },
    { rowIndex: 2, interviewContent: "일정이 맞지 않아서요", notes: "" },
    { rowIndex: 3, interviewContent: "다른 학원을 선택했습니다", notes: "" },
  ],
};

test.describe("분류 중 화면", () => {
  test.beforeEach(async ({ page, context }) => {
    // Set localStorage before navigation so SessionGuard passes
    await context.addInitScript(
      ({ sessionId, draft }) => {
        window.localStorage.setItem("session_id", sessionId);
        window.localStorage.setItem("classification_draft", JSON.stringify(draft));
      },
      { sessionId: SESSION_ID, draft: DRAFT },
    );

    // Slow response keeps the "classifying" stage visible for UI interaction
    await page.route("**/api/classify", async (route) => {
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ processedCount: 3, reviewCount: 0 }),
      });
    });

    await page.route("**/api/insight", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });
  });

  test("분류 진행 상태가 표시된다", async ({ page }) => {
    await page.goto("/analyzing");
    await expect(page.getByText(/건 완료 \/ \d+건 전체/)).toBeVisible();
  });

  test("기수 이름이 표시된다", async ({ page }) => {
    await page.goto("/analyzing");
    await expect(page.getByText("26기")).toBeVisible();
  });

  test("'분류 취소' 버튼이 표시된다", async ({ page }) => {
    await page.goto("/analyzing");
    await expect(page.getByRole("button", { name: "분류 취소" })).toBeVisible();
  });

  test("'분류 취소' 클릭 시 확인 다이얼로그가 표시된다", async ({ page }) => {
    await page.goto("/analyzing");
    await page.getByRole("button", { name: "분류 취소" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByText("분류를 취소하시겠습니까?")).toBeVisible();
    await expect(page.getByText("지금까지의 결과는 저장되지 않습니다.")).toBeVisible();
  });

  test("다이얼로그에서 '계속 진행'을 선택하면 분류 화면이 유지된다", async ({ page }) => {
    await page.goto("/analyzing");
    await page.getByRole("button", { name: "분류 취소" }).click();
    await page.getByRole("button", { name: "계속 진행" }).click();
    await expect(page).toHaveURL(/\/analyzing/);
    await expect(page.getByRole("alertdialog")).not.toBeVisible();
  });

  test("'취소 확인' 클릭 시 세션 취소 API를 호출하고 /upload로 이동한다", async ({ page }) => {
    let cancelApiCalled = false;

    await page.route(`**/api/sessions/${SESSION_ID}`, async (route) => {
      cancelApiCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/analyzing");
    await page.getByRole("button", { name: "분류 취소" }).click();
    await page.getByRole("button", { name: "취소 확인" }).click();

    await expect(page).toHaveURL(/\/upload/);
    expect(cancelApiCalled).toBe(true);
  });
});

test.describe("분류 중 화면 — draft 없음", () => {
  test.beforeEach(async ({ context }) => {
    // session_id만 있고 classification_draft는 없음
    await context.addInitScript(() => {
      window.localStorage.setItem("session_id", "some-session");
    });
  });

  test("draft 없이 접근하면 에러 메시지와 '업로드 화면으로 돌아가기' 버튼이 표시된다", async ({
    page,
  }) => {
    await page.goto("/analyzing");
    await expect(page.getByText(/업로드 화면에서 다시 시작/)).toBeVisible();
    await expect(page.getByRole("button", { name: "업로드 화면으로 돌아가기" })).toBeVisible();
  });

  test("'업로드 화면으로 돌아가기' 버튼을 클릭하면 /upload로 이동한다", async ({ page }) => {
    await page.goto("/analyzing");
    await page.getByRole("button", { name: "업로드 화면으로 돌아가기" }).click();
    await expect(page).toHaveURL(/\/upload/);
  });
});
