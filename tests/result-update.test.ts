import test from "node:test";
import assert from "node:assert/strict";

import {
  ResultUpdateRequestSchema,
  applyResultRowPatch,
  buildEditableFieldPatch,
  buildReviewStatePatch,
} from "../src/result/result-update";
import type { ResultRowSummary } from "../src/result/result-summary";

const baseRow: ResultRowSummary = {
  id: "result-1",
  rowIndex: 2,
  interviewContent: "카드 발급 지연으로 취소",
  notes: "승인 대기",
  primaryCause: "내일배움카드 이슈",
  secondaryAction: "카드 발급 안내",
  detailTags: "발급 지연",
  competingCourse: null,
  reasoning: "카드 발급 지연 때문에 취소했습니다.",
  needsReview: true,
  reviewCompleted: false,
};

test("ResultUpdateRequestSchema accepts editable result fields and rejects empty patches", () => {
  assert.equal(
    ResultUpdateRequestSchema.safeParse({
      resultId: "result-1",
      primaryCause: "일정 충돌",
    }).success,
    true,
  );
  assert.equal(
    ResultUpdateRequestSchema.safeParse({
      resultId: "result-1",
    }).success,
    false,
  );
});

test("buildEditableFieldPatch trims text and turns empty text into null", () => {
  assert.deepEqual(buildEditableFieldPatch("primaryCause", "  일정 충돌  "), {
    primaryCause: "일정 충돌",
  });
  assert.deepEqual(buildEditableFieldPatch("detailTags", "   "), {
    detailTags: null,
  });
});

test("buildReviewStatePatch maps completed state to database review flags", () => {
  assert.deepEqual(buildReviewStatePatch("done"), { needsReview: false });
  assert.deepEqual(buildReviewStatePatch("review"), { needsReview: true });
});

test("applyResultRowPatch updates text fields and review state optimistically", () => {
  const textUpdated = applyResultRowPatch(baseRow, { primaryCause: "일정 충돌" });

  assert.equal(textUpdated.primaryCause, "일정 충돌");
  assert.equal(textUpdated.reviewCompleted, false);

  const doneUpdated = applyResultRowPatch(baseRow, { needsReview: false });

  assert.equal(doneUpdated.needsReview, false);
  assert.equal(doneUpdated.reviewCompleted, true);
});
