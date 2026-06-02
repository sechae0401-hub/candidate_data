import test from "node:test";
import assert from "node:assert/strict";

import { findSimilarColumnName, validateTemplateColumns } from "../src/upload/template-validation";

test("passes when all required template columns are present", () => {
  const result = validateTemplateColumns(["인터뷰내용", "특이사항", "최종결과"]);

  assert.equal(result.status, "valid");
  assert.equal(result.message, "양식 확인 완료. AI 컬럼 분석을 시작합니다");
});

test("returns a missing-column result when a required column is absent", () => {
  const result = validateTemplateColumns(["특이사항", "최종결과"]);

  assert.equal(result.status, "missing-column");
  assert.equal(result.missingColumn, "인터뷰내용");
  assert.equal(result.message, "'인터뷰내용' 컬럼이 없습니다. 파일에 '인터뷰내용', '특이사항', '최종결과' 컬럼이 있어야 합니다");
});

test("suggests a similar column when the uploaded file uses a nearby label", () => {
  const result = validateTemplateColumns(["면담내용", "특이사항", "최종결과"]);

  assert.equal(result.status, "similar-column");
  assert.equal(result.missingColumn, "인터뷰내용");
  assert.equal(result.similarColumn, "면담내용");
});

test("findSimilarColumnName ignores low-confidence candidates", () => {
  assert.equal(findSimilarColumnName("인터뷰내용", ["수강상태", "메모"]), null);
});

