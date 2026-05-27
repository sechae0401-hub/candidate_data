import test from "node:test";
import assert from "node:assert/strict";

import { buildSessionInsertPayload } from "../src/upload/session-start";

test("buildSessionInsertPayload normalizes cohort name and selected values", () => {
  const payload = buildSessionInsertPayload({
    cohortName: " 3기 ",
    totalRows: 52,
    excludedRows: 8,
    selectedResultValues: ["취소", "환불"],
  });

  assert.deepEqual(payload, {
    cohort_name: "3기",
    total_rows: 52,
    excluded_rows: 8,
    selected_result_values: ["취소", "환불"],
    status: "queued",
  });
});

test("buildSessionInsertPayload rejects empty selected values", () => {
  assert.throws(
    () =>
      buildSessionInsertPayload({
        cohortName: null,
        totalRows: 10,
        excludedRows: 10,
        selectedResultValues: [],
      }),
    /분류 세션 요청이 올바르지 않습니다/,
  );
});

