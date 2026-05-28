import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInterviewSummary,
  calculateResultSummary,
  getResultReviewState,
} from "../src/result/result-summary";

const reviewRow = {
  id: "result-1",
  rowIndex: 2,
  interviewContent: "내일배움카드 발급이 늦어져서 개강 전 취소를 요청했습니다.",
  notes: "카드 승인 대기 중",
  primaryCause: "내일배움카드 이슈",
  secondaryAction: "카드 발급 안내",
  detailTags: "발급 지연",
  competingCourse: null,
  reasoning: "카드 발급 지연 때문에 수강 취소를 요청했습니다.",
  needsReview: true,
  reviewCompleted: false,
};

const doneRow = {
  ...reviewRow,
  id: "result-2",
  rowIndex: 3,
  needsReview: false,
  reviewCompleted: true,
};

test("calculateResultSummary counts total, review, and completed rows", () => {
  assert.deepEqual(calculateResultSummary([reviewRow, doneRow]), {
    totalCount: 2,
    reviewCount: 1,
    completedCount: 1,
  });
});

test("getResultReviewState treats review_completed rows as completed", () => {
  assert.equal(getResultReviewState({ needsReview: true, reviewCompleted: true }), "done");
  assert.equal(getResultReviewState({ needsReview: true, reviewCompleted: false }), "review");
  assert.equal(getResultReviewState({ needsReview: false, reviewCompleted: false }), "done");
});

test("buildInterviewSummary prefers source text and falls back safely", () => {
  assert.equal(buildInterviewSummary(reviewRow), "내일배움카드 발급이 늦어져서 개강 전 취소를 요청했습니다.");
  assert.equal(
    buildInterviewSummary({
      ...reviewRow,
      interviewContent: "   ",
      notes: "담당자 메모만 남아 있습니다.",
    }),
    "담당자 메모만 남아 있습니다.",
  );
  assert.equal(
    buildInterviewSummary({
      ...reviewRow,
      interviewContent: null,
      notes: null,
    }),
    "원문 없음",
  );
});

test("buildInterviewSummary truncates long source text", () => {
  assert.equal(buildInterviewSummary({ ...reviewRow, interviewContent: "가".repeat(70) }, 20), `${"가".repeat(20)}...`);
});
