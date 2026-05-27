import test from "node:test";
import assert from "node:assert/strict";

import type { WorkbookSnapshot } from "../src/upload/types";
import { countRowsForSelectedResultValues, getResultValueOptions } from "../src/upload/result-selection";

const snapshot: WorkbookSnapshot = {
  firstSheetName: "Sheet1",
  columns: ["인터뷰내용", "특이사항", "최종결과"],
  rows: [
    { 인터뷰내용: "사유1", 특이사항: "", 최종결과: "취소" },
    { 인터뷰내용: "사유2", 특이사항: "", 최종결과: "보류" },
    { 인터뷰내용: "사유3", 특이사항: "", 최종결과: "취소" },
    { 인터뷰내용: "사유4", 특이사항: "", 최종결과: "환불" },
  ],
  totalRows: 4,
};

test("getResultValueOptions groups and counts final result values", () => {
  const options = getResultValueOptions(snapshot);

  assert.deepEqual(options, [
    { value: "취소", count: 2 },
    { value: "보류", count: 1 },
    { value: "환불", count: 1 },
  ]);
});

test("countRowsForSelectedResultValues counts only selected rows", () => {
  assert.equal(countRowsForSelectedResultValues(snapshot, ["취소", "환불"]), 3);
  assert.equal(countRowsForSelectedResultValues(snapshot, []), 0);
});
