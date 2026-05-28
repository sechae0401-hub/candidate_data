import test from "node:test";
import assert from "node:assert/strict";

import {
  ClassifyRequestSchema,
  buildClassificationPrompt,
  buildClassificationResultInsertPayloads,
  buildNewCategoryInsertPayloads,
  classifyRows,
  parseClassificationResponse,
} from "../src/classify/classification-engine";

const sampleRow = {
  rowIndex: 2,
  interviewContent: "내일배움카드 발급이 늦어져 수강 취소",
  notes: "카드 승인 대기",
  resultValue: "취소",
  source: {
    인터뷰내용: "내일배움카드 발급이 늦어져 수강 취소",
    특이사항: "카드 승인 대기",
    최종결과: "취소",
  },
};

test("ClassifyRequestSchema accepts at most three rows", () => {
  assert.equal(
    ClassifyRequestSchema.safeParse({
      sessionId: "session-1",
      rows: [sampleRow, sampleRow, sampleRow],
    }).success,
    true,
  );

  assert.equal(
    ClassifyRequestSchema.safeParse({
      sessionId: "session-1",
      rows: [sampleRow, sampleRow, sampleRow, sampleRow],
    }).success,
    false,
  );
});

test("buildClassificationPrompt includes row fields and JSON-only instruction", () => {
  const prompt = buildClassificationPrompt([sampleRow]);

  assert.match(prompt, /내일배움카드 발급이 늦어져/);
  assert.match(prompt, /1차 원인/);
  assert.match(prompt, /반드시 JSON만 응답하세요/);
});

test("parseClassificationResponse reads classification results and new categories", () => {
  const parsed = parseClassificationResponse({
    output_text: JSON.stringify({
      results: [
        {
          rowIndex: 2,
          primaryCause: "내일배움카드 이슈",
          secondaryAction: "카드 발급 안내",
          detailTags: "발급 지연",
          competingCourse: null,
          reasoning: "카드 발급 지연으로 취소함",
          needsReview: false,
        },
      ],
      newCategories: [{ categoryName: "카드 발급 지연", occurrenceCount: 1 }],
    }),
  });

  assert.equal(parsed.results[0]?.primaryCause, "내일배움카드 이슈");
  assert.equal(parsed.newCategories[0]?.categoryName, "카드 발급 지연");
});

test("classifyRows tags empty content without calling OpenAI", async () => {
  let calls = 0;
  const result = await classifyRows(
    {
      sessionId: "session-1",
      rows: [
        {
          rowIndex: 3,
          interviewContent: "",
          notes: " ",
          resultValue: "취소",
          source: {},
        },
      ],
    },
    async () => {
      calls += 1;
      return { output_text: "{}" };
    },
  );

  assert.equal(calls, 0);
  assert.equal(result.results[0]?.primaryCause, "정보 부족");
  assert.equal(result.results[0]?.needsReview, true);
  assert.equal(result.reviewCount, 1);
});

test("classifyRows retries once at row layer and then falls back to review", async () => {
  let calls = 0;
  const result = await classifyRows(
    {
      sessionId: "session-1",
      rows: [sampleRow],
    },
    async () => {
      calls += 1;
      throw new Error("OpenAI unavailable");
    },
    async () => undefined,
  );

  assert.equal(calls, 2);
  assert.equal(result.results[0]?.primaryCause, "분류 실패");
  assert.equal(result.results[0]?.needsReview, true);
  assert.equal(result.processedCount, 1);
  assert.equal(result.reviewCount, 1);
});

test("build insert payloads map classification results to database columns", () => {
  const payloads = buildClassificationResultInsertPayloads("session-1", [
    {
      rowIndex: 2,
      primaryCause: "내일배움카드 이슈",
      secondaryAction: "카드 발급 안내",
      detailTags: "발급 지연",
      competingCourse: null,
      reasoning: "카드 발급 지연",
      needsReview: false,
    },
  ]);

  assert.deepEqual(payloads[0], {
    session_id: "session-1",
    row_index: 2,
    primary_cause: "내일배움카드 이슈",
    secondary_action: "카드 발급 안내",
    detail_tags: "발급 지연",
    competing_course: null,
    reasoning: "카드 발급 지연",
    needs_review: false,
    review_completed: true,
  });
});

test("buildNewCategoryInsertPayloads merges duplicate category names", () => {
  assert.deepEqual(buildNewCategoryInsertPayloads("session-1", [
    { categoryName: "카드 발급 지연", occurrenceCount: 1 },
    { categoryName: " 카드 발급 지연 ", occurrenceCount: 2 },
  ]), [
    {
      session_id: "session-1",
      category_name: "카드 발급 지연",
      occurrence_count: 3,
    },
  ]);
});
