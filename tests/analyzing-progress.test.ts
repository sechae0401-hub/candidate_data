import test from "node:test";
import assert from "node:assert/strict";

import {
  CLASSIFICATION_BATCH_SIZE,
  buildBatchRanges,
  buildReviewNotice,
  calculateProgressPercent,
  getAnalyzingStageLabel,
  hasFullClassificationFailure,
} from "../src/classify/analyzing-progress";
import { buildClassificationDraft } from "../src/upload/classification-draft";

test("buildClassificationDraft keeps only rows with selected result values", () => {
  const draft = buildClassificationDraft({
    sessionId: "session-1",
    cohortName: "3기",
    selectedResultValues: ["취소"],
    snapshot: {
      firstSheetName: "Sheet1",
      columns: ["인터뷰내용", "특이사항", "최종결과"],
      totalRows: 3,
      rows: [
        { 인터뷰내용: "카드 발급 지연", 특이사항: "", 최종결과: "취소" },
        { 인터뷰내용: "정상 등록", 특이사항: "", 최종결과: "합격" },
        { 인터뷰내용: "", 특이사항: "연락 불가", 최종결과: "취소" },
      ],
    },
  });

  assert.equal(draft.sessionId, "session-1");
  assert.equal(draft.cohortName, "3기");
  assert.equal(draft.rows.length, 2);
  assert.deepEqual(
    draft.rows.map((row) => row.rowIndex),
    [2, 4],
  );
});

test("buildClassificationDraft rejects workbooks over 200 data rows", () => {
  assert.throws(
    () =>
      buildClassificationDraft({
        sessionId: "session-1",
        cohortName: null,
        selectedResultValues: ["취소"],
        snapshot: {
          firstSheetName: "Sheet1",
          columns: ["인터뷰내용", "특이사항", "최종결과"],
          totalRows: 201,
          rows: Array.from({ length: 201 }, (_, i) => ({
            인터뷰내용: `사유${i}`,
            특이사항: "",
            최종결과: "취소",
          })),
        },
      }),
    /파일 크기\(또는 행 수\) 제한을 초과했습니다/,
  );
});

test("buildBatchRanges returns three-row ranges", () => {
  assert.equal(CLASSIFICATION_BATCH_SIZE, 3);
  assert.deepEqual(buildBatchRanges(12), [
    { startIndex: 0, endIndex: 3 },
    { startIndex: 3, endIndex: 6 },
    { startIndex: 6, endIndex: 9 },
    { startIndex: 9, endIndex: 12 },
  ]);
});

test("calculateProgressPercent clamps progress safely", () => {
  assert.equal(calculateProgressPercent(0, 0), 0);
  assert.equal(calculateProgressPercent(2, 5), 40);
  assert.equal(calculateProgressPercent(8, 5), 100);
});

test("analyzing labels and failure notices are stable", () => {
  assert.equal(getAnalyzingStageLabel("classifying"), "취소 사유 분류 중");
  assert.equal(getAnalyzingStageLabel("insight"), "인사이트 요약 생성 중");
  assert.equal(buildReviewNotice(3), "3건 검토 필요로 처리됨, 계속 진행 중");
  assert.equal(hasFullClassificationFailure({ totalRows: 6, completedRows: 0, failedRows: 6 }), true);
  assert.equal(hasFullClassificationFailure({ totalRows: 6, completedRows: 6, failedRows: 6 }), true);
  assert.equal(hasFullClassificationFailure({ totalRows: 6, completedRows: 6, failedRows: 0 }), false);
});
