import { test, expect } from "@playwright/test";

const SESSION_ID = "test-session-result";

const MOCK_RESULT = {
  session: {
    id: SESSION_ID,
    status: "completed",
    cohort_name: "26기",
    total_rows: 2,
    excluded_rows: 0,
    analyzed_at: "2026-06-01T10:00:00Z",
    insight_summary: JSON.stringify({
      summary: "비용 문제가 주요 취소 사유입니다.",
      topPrimaryCauses: [{ primaryCause: "비용 부담", count: 2, percentage: 100 }],
      topSecondaryActions: [{ secondaryAction: "환불 요청", count: 1, percentage: 50 }],
      competingCourses: [],
      recommendedActions: ["환급 조건 개선 검토"],
      cohortComparison: { notice: "이전 기수 데이터가 없습니다.", comparisons: [] },
    }),
  },
  results: [
    {
      id: "row-1",
      row_index: 1,
      interview_content: "비용이 너무 비쌌어요",
      notes: "추가 특이사항 없음",
      primary_cause: "비용 부담",
      secondary_action: "환불 요청",
      detail_tags: "가격,경제적 부담",
      competing_course: null,
      reasoning: "비용 관련 언급이 명확함",
      needs_review: false,
      review_completed: true,
    },
    {
      id: "row-2",
      row_index: 2,
      interview_content: "다른 학원을 선택했어요",
      notes: "",
      primary_cause: "타 과정 선택",
      secondary_action: null,
      detail_tags: "경쟁사",
      competing_course: "패스트캠퍼스",
      reasoning: "타 과정 관련 언급이 있음",
      needs_review: true,
      review_completed: false,
    },
  ],
  newCategories: [],
};

test.describe("결과 페이지", () => {
  test.beforeEach(async ({ page, context }) => {
    // Set localStorage before navigation so SessionGuard passes
    await context.addInitScript(
      ({ sessionId }) => {
        window.localStorage.setItem("session_id", sessionId);
      },
      { sessionId: SESSION_ID },
    );

    await page.route(`**/api/result/${SESSION_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_RESULT),
      });
    });
  });

  test("분류 완료 헤더가 기수명과 함께 표시된다", async ({ page }) => {
    await page.goto("/result");
    await expect(page.getByText("26기 취소 분석이 완료됐습니다")).toBeVisible();
  });

  test("요약 배지가 전체·검토 필요·완료 건수를 표시한다", async ({ page }) => {
    await page.goto("/result");
    await expect(page.getByText("전체 2건", { exact: true })).toBeVisible();
    // Use exact: true to match the badge element, not the subheader paragraph
    await expect(page.getByText("검토 필요 1건", { exact: true })).toBeVisible();
    await expect(page.getByText("완료 1건", { exact: true })).toBeVisible();
  });

  test("결과 테이블에 인터뷰 내용이 표시된다", async ({ page }) => {
    await page.goto("/result");
    // Scope to table to avoid matching the original source panel
    await expect(page.locator("table").getByText("비용이 너무 비쌌어요")).toBeVisible();
    await expect(page.locator("table").getByText("다른 학원을 선택했어요")).toBeVisible();
  });

  test("행을 클릭하면 원문 패널에 인터뷰 전문이 표시된다", async ({ page }) => {
    await page.goto("/result");
    // Click the first table row (notes: "추가 특이사항 없음")
    await page.locator("tbody tr").nth(0).click();
    await expect(page.getByRole("complementary").getByText("원문")).toBeVisible();
    await expect(page.getByText("추가 특이사항 없음")).toBeVisible();
  });

  test("'검토 필요' 배지를 클릭하면 '완료'로 전환된다", async ({ page }) => {
    await page.route(`**/api/result/${SESSION_ID}/update`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/result");

    // The second row has needs_review=true → shows "검토 필요" badge
    const reviewBadge = page
      .getByRole("button")
      .filter({ has: page.getByText("검토 필요") })
      .first();
    await reviewBadge.click();

    // Optimistic update: summary should now show "완료 2건"
    await expect(page.getByText("완료 2건")).toBeVisible();
  });

  test("1차 원인 셀을 클릭하면 인라인 편집 입력창이 나타난다", async ({ page }) => {
    await page.goto("/result");

    await page.getByRole("button", { name: "비용 부담" }).click();

    await expect(page.getByRole("textbox")).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveValue("비용 부담");
  });

  test("편집 중 Escape 키를 누르면 편집이 취소된다", async ({ page }) => {
    await page.goto("/result");

    await page.getByRole("button", { name: "비용 부담" }).click();
    const input = page.getByRole("textbox");
    await expect(input).toBeVisible();

    await input.press("Escape");
    await expect(input).not.toBeVisible();
    await expect(page.getByRole("button", { name: "비용 부담" })).toBeVisible();
  });

  test("편집 후 Enter를 누르면 수정 API가 호출된다", async ({ page }) => {
    let updateBody: Record<string, unknown> | null = null;

    await page.route(`**/api/result/${SESSION_ID}/update`, async (route) => {
      updateBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/result");
    await page.getByRole("button", { name: "비용 부담" }).click();

    const input = page.getByRole("textbox");
    await input.fill("비용 문제");

    // Set up the request promise BEFORE pressing Enter to avoid race condition
    const requestPromise = page.waitForRequest(`**/api/result/${SESSION_ID}/update`);
    await input.press("Enter");
    await requestPromise;

    expect(updateBody).toMatchObject({ resultId: "row-1", primaryCause: "비용 문제" });
  });

  test("검토 필요 행이 있을 때 '노션 형식 복사' 버튼이 비활성화된다", async ({ page }) => {
    await page.goto("/result");
    const copyBtn = page.getByRole("button", { name: "노션 형식 복사" });
    await expect(copyBtn).toBeDisabled();
  });

  test("'새 분류 시작' 버튼을 클릭하면 /upload로 이동하고 localStorage가 초기화된다", async ({
    page,
  }) => {
    await page.goto("/result");
    await page.getByRole("button", { name: "새 분류 시작" }).click();

    await expect(page).toHaveURL(/\/upload/);

    const sessionId = await page.evaluate(() => window.localStorage.getItem("session_id"));
    expect(sessionId).toBeNull();
  });

  test("인사이트 요약이 표시된다", async ({ page }) => {
    await page.goto("/result");
    await expect(page.getByText("비용 문제가 주요 취소 사유입니다.")).toBeVisible();
  });

  test("운영 추천 액션이 표시된다", async ({ page }) => {
    await page.goto("/result");
    await expect(page.getByText("환급 조건 개선 검토")).toBeVisible();
  });
});

test.describe("결과 페이지 — API 오류", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem("session_id", "error-session");
    });
  });

  test("API 오류 시 오류 메시지와 '다시 시도' 버튼이 표시된다", async ({ page }) => {
    await page.route("**/api/result/error-session", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      });
    });

    await page.goto("/result");
    await expect(page.getByText("결과를 불러오지 못했습니다")).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
  });
});
