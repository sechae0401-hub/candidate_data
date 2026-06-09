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
    유입경로: "SNS 광고",
    원본추가컬럼: "AI 프롬프트에 들어가면 안 되는 원본값",
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
  assert.match(prompt, /유입경로/);
  assert.match(prompt, /SNS 광고/);
  assert.doesNotMatch(prompt, /원본추가컬럼/);
  assert.doesNotMatch(prompt, /AI 프롬프트에 들어가면 안 되는 원본값/);
});

test("buildClassificationPrompt truncates long text and keeps large source snapshots out", () => {
  const longText = `앞쪽근거 ${"상담기록 ".repeat(500)} 뒤쪽근거`;
  const largeSource = Object.fromEntries(
    Array.from({ length: 35 }, (_, index) => [
      `원본컬럼${index}`,
      index % 5 === 0 ? longText : `원본값${index}`,
    ]),
  );
  const rows = Array.from({ length: 3 }, (_, index) => ({
    rowIndex: index + 2,
    interviewContent: longText,
    notes: longText,
    resultValue: "취소",
    source: largeSource,
  }));

  const prompt = buildClassificationPrompt(rows);

  assert.match(prompt, /\.\.\.\[truncated\]/);
  assert.match(prompt, /앞쪽근거/);
  assert.match(prompt, /뒤쪽근거/);
  assert.doesNotMatch(prompt, /원본컬럼0/);
  assert.ok(Buffer.byteLength(prompt, "utf8") <= 40000);
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
  assert.equal(result.failedCount, 1);
});

test("classifyRows splits a failed three-row batch and recovers smaller chunks", async () => {
  const rows = Array.from({ length: 3 }, (_, index) => ({
    ...sampleRow,
    rowIndex: index + 2,
  }));
  let calls = 0;

  const result = await classifyRows(
    {
      sessionId: "session-1",
      rows,
    },
    async (input) => {
      calls += 1;
      const payload = JSON.parse(input.slice(input.lastIndexOf("\n") + 1)) as {
        rows: Array<{ rowIndex: number }>;
      };

      if (payload.rows.length === 3) {
        throw new Error("batch too complex");
      }

      return {
        output_text: JSON.stringify({
          results: payload.rows.map((row) => ({
            rowIndex: row.rowIndex,
            primaryCause: "일정 충돌",
            secondaryAction: "향후 계획 미확인",
            detailTags: "일정",
            competingCourse: null,
            reasoning: "분할 재시도에서 정상 분류됨",
            needsReview: false,
          })),
          newCategories: [],
        }),
      };
    },
    async () => undefined,
  );

  assert.equal(calls, 4);
  assert.equal(result.processedCount, 3);
  assert.equal(result.failedCount, 0);
  assert.equal(result.reviewCount, 0);
});

test("build insert payloads map classification results and original row source to database columns", () => {
  const payloads = buildClassificationResultInsertPayloads(
    "session-1",
    [
      {
        rowIndex: 2,
        primaryCause: "내일배움카드 이슈",
        secondaryAction: "카드 발급 안내",
        detailTags: "발급 지연",
        competingCourse: null,
        reasoning: "카드 발급 지연",
        needsReview: false,
      },
    ],
    [sampleRow],
  );

  assert.deepEqual(payloads[0], {
    session_id: "session-1",
    row_index: 2,
    interview_content: "내일배움카드 발급이 늦어져 수강 취소",
    notes: "카드 승인 대기",
    source_snapshot: {
      인터뷰내용: "내일배움카드 발급이 늦어져 수강 취소",
      특이사항: "카드 승인 대기",
      최종결과: "취소",
      유입경로: "SNS 광고",
      원본추가컬럼: "AI 프롬프트에 들어가면 안 되는 원본값",
    },
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
