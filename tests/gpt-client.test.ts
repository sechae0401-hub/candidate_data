import test from "node:test";
import assert from "node:assert/strict";

import { runWithGptRetry } from "../src/lib/gpt-retry";

test("runWithGptRetry retries until the fourth attempt before succeeding", async () => {
  let attempts = 0;

  const result = await runWithGptRetry(
    async () => {
      attempts += 1;

      if (attempts < 4) {
        throw new Error(`attempt-${attempts}`);
      }

      return "ok";
    },
    {
      retryOptions: {
        minTimeout: 0,
        maxTimeout: 0,
      },
    },
  );

  assert.equal(result, "ok");
  assert.equal(attempts, 4);
});

test("runWithGptRetry throws after three retries", async () => {
  let attempts = 0;

  await assert.rejects(
    () =>
      runWithGptRetry(
        async () => {
          attempts += 1;
          throw new Error("still failing");
        },
        {
          retryOptions: {
            minTimeout: 0,
            maxTimeout: 0,
          },
        },
      ),
    /still failing/,
  );

  assert.equal(attempts, 4);
});
