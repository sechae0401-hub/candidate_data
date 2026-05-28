import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNewCategorySummary,
  buildNotionMarkdown,
  canCopyToNotion,
  parseStoredInsightSummary,
} from "../src/result/notion-export";
import type { ResultRowSummary } from "../src/result/result-summary";

const rows: ResultRowSummary[] = [
  {
    id: "result-1",
    rowIndex: 2,
    interviewContent: "카드 발급 지연으로 취소",
    notes: "승인 대기",
    primaryCause: "내일배움카드 이슈",
    secondaryAction: "카드 발급 안내",
    detailTags: "발급 지연",
    competingCourse: null,
    reasoning: "카드 발급 지연 때문에 취소했습니다.",
    needsReview: false,
    reviewCompleted: true,
  },
];

const storedInsight = JSON.stringify({
  summary: "내일배움카드 이슈가 가장 많습니다.",
  recommendedActions: ["내일배움카드 이슈(100%)가 높습니다. 신청 전 카드 상태를 확인하세요."],
  topPrimaryCauses: [{ primaryCause: "내일배움카드 이슈", count: 1, percentage: 100 }],
  cohortComparison: {
    notice: null,
    comparisons: [
      {
        primaryCause: "내일배움카드 이슈",
        currentPercentage: 100,
        previousAveragePercentage: 50,
        deltaPercentagePoints: 50,
      },
    ],
  },
});

test("parseStoredInsightSummary reads stored insight JSON and falls back safely", () => {
  const parsed = parseStoredInsightSummary(storedInsight);

  assert.equal(parsed.summary, "내일배움카드 이슈가 가장 많습니다.");
  assert.equal(parsed.recommendedActions.length, 1);
  assert.equal(parseStoredInsightSummary("not-json").summary, "인사이트 요약을 불러오지 못했습니다.");
});

test("canCopyToNotion requires at least one row and no remaining review rows", () => {
  assert.equal(canCopyToNotion({ totalCount: 1, reviewCount: 0, completedCount: 1 }), true);
  assert.equal(canCopyToNotion({ totalCount: 1, reviewCount: 1, completedCount: 0 }), false);
  assert.equal(canCopyToNotion({ totalCount: 0, reviewCount: 0, completedCount: 0 }), false);
});

test("buildNewCategorySummary formats new categories", () => {
  assert.equal(
    buildNewCategorySummary([
      { categoryName: "결제 이슈", occurrenceCount: 3 },
      { categoryName: "가족 일정", occurrenceCount: 1 },
    ]),
    "이번 분류에서 새로 만들어진 카테고리: 결제 이슈 (3건), 가족 일정 (1건)",
  );
});

test("buildNotionMarkdown includes insight and result table", () => {
  const markdown = buildNotionMarkdown({
    rows,
    insight: parseStoredInsightSummary(storedInsight),
    cohortName: "3기",
  });

  assert.match(markdown, /# 취소 사유 분석 결과 - 3기/);
  assert.match(markdown, /내일배움카드 이슈가 가장 많습니다/);
  assert.match(markdown, /\| 행 \| 1차 원인 \| 2차 행동 \| 세부 태그 \| 검토 여부 \| 판단 근거 \|/);
  assert.match(markdown, /\| 2 \| 내일배움카드 이슈 \| 카드 발급 안내 \| 발급 지연 \| 완료 \|/);
});
