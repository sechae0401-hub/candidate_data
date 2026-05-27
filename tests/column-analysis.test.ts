import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeWorkbookColumns,
  buildColumnAnalysisPrompt,
  parseColumnAnalysisResponse,
} from "../src/upload/column-analysis";

test("buildColumnAnalysisPrompt includes columns and sample rows", () => {
  const prompt = buildColumnAnalysisPrompt({
    columns: ["인터뷰내용", "특이사항", "최종결과"],
    sampleRows: [
      {
        인터뷰내용: "수업 참여 어려움",
        특이사항: "주말 일정 충돌",
        최종결과: "취소",
      },
    ],
  });

  assert.match(prompt, /인터뷰내용, 특이사항, 최종결과/);
  assert.match(prompt, /수업 참여 어려움/);
  assert.match(prompt, /반드시 JSON만 응답하세요/);
});

test("parseColumnAnalysisResponse reads JSON from output_text", () => {
  const analyses = parseColumnAnalysisResponse({
    output_text: JSON.stringify({
      columnAnalyses: [
        {
          columnName: "인터뷰내용",
          understanding: "수강자가 남긴 면담 요약 내용입니다.",
        },
      ],
    }),
  });

  assert.equal(analyses[0]?.columnName, "인터뷰내용");
  assert.equal(analyses[0]?.understanding, "수강자가 남긴 면담 요약 내용입니다.");
});

test("parseColumnAnalysisResponse throws when output_text is null", () => {
  assert.throws(
    () => parseColumnAnalysisResponse({ output_text: null }),
    /AI 분석 결과를 읽지 못했습니다/,
  );
});

test("parseColumnAnalysisResponse throws when output_text is undefined", () => {
  assert.throws(
    () => parseColumnAnalysisResponse({}),
    /AI 분석 결과를 읽지 못했습니다/,
  );
});

test("parseColumnAnalysisResponse throws when output_text is not valid JSON", () => {
  assert.throws(
    () => parseColumnAnalysisResponse({ output_text: "not-json" }),
    /AI 분석 결과 형식이 올바르지 않습니다/,
  );
});

test("parseColumnAnalysisResponse throws when columnAnalyses array is empty", () => {
  assert.throws(
    () => parseColumnAnalysisResponse({ output_text: JSON.stringify({ columnAnalyses: [] }) }),
    /AI 분석 결과 형식이 올바르지 않습니다/,
  );
});

test("analyzeWorkbookColumns validates requests before calling OpenAI", async () => {
  await assert.rejects(
    () =>
      analyzeWorkbookColumns({
        columns: [],
        sampleRows: [],
      }, async () => ({ output_text: "" })),
    /업로드 컬럼 분석 요청이 올바르지 않습니다/,
  );
});

test("analyzeWorkbookColumns returns parsed column analyses", async () => {
  const analyses = await analyzeWorkbookColumns(
    {
      columns: ["인터뷰내용"],
      sampleRows: [
        {
          인터뷰내용: "휴학 예정",
        },
      ],
    },
    async () => ({
      output_text: JSON.stringify({
        columnAnalyses: [
          {
            columnName: "인터뷰내용",
            understanding: "수강자의 면담 내용을 담은 컬럼입니다.",
          },
        ],
      }),
    }),
  );

  assert.equal(analyses[0]?.understanding, "수강자의 면담 내용을 담은 컬럼입니다.");
});
