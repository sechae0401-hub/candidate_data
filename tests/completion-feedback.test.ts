import test from "node:test";
import assert from "node:assert/strict";

import {
  COMPLETION_FADE_DURATION_MS,
  COMPLETION_MESSAGE_DURATION_MS,
  buildCompletionMessage,
} from "../src/classify/completion-feedback";

test("completion feedback timing matches UX requirement", () => {
  assert.equal(COMPLETION_MESSAGE_DURATION_MS, 1000);
  assert.equal(COMPLETION_FADE_DURATION_MS, 150);
});

test("buildCompletionMessage includes completed row count", () => {
  assert.equal(buildCompletionMessage(42), "42건 분류 완료!");
});
