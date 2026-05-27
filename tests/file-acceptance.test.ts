import test from "node:test";
import assert from "node:assert/strict";

import {
  WORKBOOK_FILE_ERROR_MESSAGE,
  WORKBOOK_FILE_SIZE_ERROR_MESSAGE,
  formatWorkbookSummary,
  getWorkbookFileError,
} from "../src/upload/file-acceptance";

test("rejects files that are not xlsx or xls", () => {
  const error = getWorkbookFileError({
    name: "candidates.csv",
    size: 1024,
  });

  assert.equal(error, WORKBOOK_FILE_ERROR_MESSAGE);
});

test("rejects files larger than 10MB", () => {
  const error = getWorkbookFileError({
    name: "candidates.xlsx",
    size: 10 * 1024 * 1024 + 1,
  });

  assert.equal(error, WORKBOOK_FILE_SIZE_ERROR_MESSAGE);
});

test("formats workbook upload summary with row count", () => {
  assert.equal(formatWorkbookSummary("취소자_3기.xlsx", 52), "취소자_3기.xlsx | 총 52행");
});

