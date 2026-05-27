import test from "node:test";
import assert from "node:assert/strict";

import { shouldRedirectToUpload } from "../src/shared/session/session-guard";

test("protected routes redirect when session_id is missing", () => {
  assert.equal(shouldRedirectToUpload("/analyzing", null), true);
  assert.equal(shouldRedirectToUpload("/result", null), true);
});

test("upload route and present session do not redirect", () => {
  assert.equal(shouldRedirectToUpload("/upload", null), false);
  assert.equal(shouldRedirectToUpload("/analyzing", "session-123"), false);
});
