import test from "node:test";
import assert from "node:assert/strict";

import {
  FIRST_COHORT_COMPARISON_NOTICE,
  buildCohortComparisons,
  buildInsightPrompt,
  buildStoredInsightSummary,
  calculateTopPrimaryCauseShares,
  calculateTopSecondaryActionShares,
  calculateCompetingCourseShares,
  parseInsightResponse,
} from "../src/classify/insight-summary";

const currentResults = [
  { primaryCause: "내일배움카드 이슈", needsReview: false },
  { primaryCause: "내일배움카드 이슈", needsReview: false },
  { primaryCause: "일정 충돌", needsReview: true },
  { primaryCause: "개인 사정", needsReview: false },
];

test("calculateTopPrimaryCauseShares returns top causes with percentages", () => {
  assert.deepEqual(calculateTopPrimaryCauseShares(currentResults), [
    { primaryCause: "내일배움카드 이슈", count: 2, percentage: 50 },
    { primaryCause: "일정 충돌", count: 1, percentage: 25 },
    { primaryCause: "개인 사정", count: 1, percentage: 25 },
  ]);
});

test("buildCohortComparisons returns first cohort notice when no previous sessions exist", () => {
  assert.deepEqual(buildCohortComparisons(calculateTopPrimaryCauseShares(currentResults), []), {
    notice: FIRST_COHORT_COMPARISON_NOTICE,
    comparisons: [],
  });
});

test("buildCohortComparisons averages previous completed cohorts by cause", () => {
  const comparison = buildCohortComparisons(calculateTopPrimaryCauseShares(currentResults), [
    {
      sessionId: "previous-1",
      results: [
        { primaryCause: "내일배움카드 이슈" },
        { primaryCause: "일정 충돌" },
        { primaryCause: "일정 충돌" },
        { primaryCause: "개인 사정" },
      ],
    },
    {
      sessionId: "previous-2",
      results: [
        { primaryCause: "내일배움카드 이슈" },
        { primaryCause: "내일배움카드 이슈" },
        { primaryCause: "개인 사정" },
        { primaryCause: "개인 사정" },
      ],
    },
  ]);

  assert.deepEqual(comparison.comparisons[0], {
    primaryCause: "내일배움카드 이슈",
    currentPercentage: 50,
    previousAveragePercentage: 38,
    deltaPercentagePoints: 12,
  });
});

test("parseInsightResponse reads summary and one to three recommended actions", () => {
  const parsed = parseInsightResponse({
    output_text: JSON.stringify({
      summary: "카드 발급 지연이 가장 큰 취소 원인입니다.",
      recommendedActions: ["내일배움카드 이슈(50%)가 높습니다. 신청 전 카드 발급 상태를 확인하세요."],
    }),
  });

  assert.equal(parsed.summary, "카드 발급 지연이 가장 큰 취소 원인입니다.");
  assert.equal(parsed.recommendedActions.length, 1);
});

test("buildInsightPrompt includes current shares and cohort comparison", () => {
  const prompt = buildInsightPrompt({
    topPrimaryCauses: calculateTopPrimaryCauseShares(currentResults),
    cohortComparison: {
      notice: FIRST_COHORT_COMPARISON_NOTICE,
      comparisons: [],
    },
  });

  assert.match(prompt, /운영팀을 위한 구체적인 개선 제안/);
  assert.match(prompt, /내일배움카드 이슈/);
  assert.match(prompt, /첫 기수입니다/);
});

test("buildStoredInsightSummary serializes generated insight and comparison", () => {
  const stored = buildStoredInsightSummary({
    insight: {
      summary: "요약",
      recommendedActions: ["내일배움카드 이슈(50%)가 높습니다. 안내를 강화하세요."],
    },
    topPrimaryCauses: calculateTopPrimaryCauseShares(currentResults),
    topSecondaryActions: [],
    competingCourses: [],
    cohortComparison: {
      notice: FIRST_COHORT_COMPARISON_NOTICE,
      comparisons: [],
    },
  });

  assert.deepEqual(JSON.parse(stored), {
    summary: "요약",
    recommendedActions: ["내일배움카드 이슈(50%)가 높습니다. 안내를 강화하세요."],
    topPrimaryCauses: calculateTopPrimaryCauseShares(currentResults),
    topSecondaryActions: [],
    competingCourses: [],
    cohortComparison: {
      notice: FIRST_COHORT_COMPARISON_NOTICE,
      comparisons: [],
    },
  });
});

test("calculateTopSecondaryActionShares counts non-null actions and returns top 5", () => {
  const results = [
    { secondaryAction: "카드 발급 안내" },
    { secondaryAction: "카드 발급 안내" },
    { secondaryAction: "일정 조율 지원" },
    { secondaryAction: null },
    { secondaryAction: "  " },
  ];

  const shares = calculateTopSecondaryActionShares(results);

  assert.equal(shares.length, 2);
  assert.equal(shares[0]?.secondaryAction, "카드 발급 안내");
  assert.equal(shares[0]?.count, 2);
  assert.equal(shares[0]?.percentage, 40);
  assert.equal(shares[1]?.secondaryAction, "일정 조율 지원");
  assert.equal(shares[1]?.count, 1);
});

test("calculateTopSecondaryActionShares returns empty array when all actions are null", () => {
  const shares = calculateTopSecondaryActionShares([
    { secondaryAction: null },
    { secondaryAction: "" },
  ]);

  assert.deepEqual(shares, []);
});

test("calculateCompetingCourseShares counts courses relative to respondents only", () => {
  const results = [
    { competingCourse: "자바 입문" },
    { competingCourse: "자바 입문" },
    { competingCourse: "파이썬 기초" },
    { competingCourse: null },
    { competingCourse: "  " },
  ];

  const shares = calculateCompetingCourseShares(results);

  assert.equal(shares.length, 2);
  assert.equal(shares[0]?.courseName, "자바 입문");
  assert.equal(shares[0]?.count, 2);
  assert.equal(shares[0]?.respondentPercentage, 67);
});

test("calculateCompetingCourseShares returns empty array when no respondents", () => {
  const shares = calculateCompetingCourseShares([
    { competingCourse: null },
    { competingCourse: "" },
  ]);

  assert.deepEqual(shares, []);
});
