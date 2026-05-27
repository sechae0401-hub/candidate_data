import test from "node:test";
import assert from "node:assert/strict";

import { createWorkbookSnapshotFromMatrix } from "../src/upload/workbook-data";

test("creates workbook snapshot from the first sheet matrix", () => {
  const snapshot = createWorkbookSnapshotFromMatrix(
    [
      ["인터뷰내용", "특이사항", "최종결과"],
      ["수강 포기 의사", "주말 일정 변경", "취소"],
      ["등록 보류", "", "보류"],
    ],
    "Sheet1",
  );

  assert.equal(snapshot.firstSheetName, "Sheet1");
  assert.deepEqual(snapshot.columns, ["인터뷰내용", "특이사항", "최종결과"]);
  assert.equal(snapshot.totalRows, 2);
  assert.deepEqual(snapshot.rows[0], {
    인터뷰내용: "수강 포기 의사",
    특이사항: "주말 일정 변경",
    최종결과: "취소",
  });
});

test("returns empty snapshot from completely empty matrix", () => {
  const snapshot = createWorkbookSnapshotFromMatrix([], "Sheet1");

  assert.deepEqual(snapshot.columns, []);
  assert.equal(snapshot.totalRows, 0);
  assert.deepEqual(snapshot.rows, []);
});

test("returns zero rows when body rows are all blank", () => {
  const snapshot = createWorkbookSnapshotFromMatrix(
    [
      ["인터뷰내용", "최종결과"],
      ["", ""],
      ["", ""],
    ],
    "Sheet1",
  );

  assert.equal(snapshot.totalRows, 0);
});

test("skips empty body rows while keeping generated fallback headers", () => {
  const snapshot = createWorkbookSnapshotFromMatrix(
    [
      ["", "최종결과"],
      ["", ""],
      ["김수강", "취소"],
    ],
    "Sheet1",
  );

  assert.deepEqual(snapshot.columns, ["컬럼1", "최종결과"]);
  assert.equal(snapshot.totalRows, 1);
  assert.equal(snapshot.rows[0]["컬럼1"], "김수강");
});
