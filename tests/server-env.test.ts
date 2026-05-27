import test from "node:test";
import assert from "node:assert/strict";

import { readOpenAiEnv, readServerEnv, readSupabaseEnv } from "../src/shared/env/read-server-env";

const validEnv = {
  OPENAI_API_KEY: "test-openai",
  OPENAI_MODEL: "gpt-5.5",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
  SUPABASE_URL: "https://example.supabase.co",
};

test("readServerEnv returns the required server variables", () => {
  assert.deepEqual(readServerEnv(validEnv), validEnv);
});

test("split env readers only require their own keys", () => {
  assert.deepEqual(readOpenAiEnv(validEnv), {
    OPENAI_API_KEY: "test-openai",
    OPENAI_MODEL: "gpt-5.5",
  });
  assert.deepEqual(readSupabaseEnv(validEnv), {
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
    SUPABASE_URL: "https://example.supabase.co",
  });
});

test("readServerEnv throws when a required variable is missing", () => {
  assert.throws(
    () =>
      readServerEnv({
        ...validEnv,
        OPENAI_MODEL: "",
      }),
    /Missing required server environment variable: OPENAI_MODEL/,
  );
});
