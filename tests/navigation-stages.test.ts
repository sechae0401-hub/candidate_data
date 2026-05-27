import test from "node:test";
import assert from "node:assert/strict";

import { APP_STAGES, getStageForPath } from "../src/shared/navigation/stages";

test("application stages stay in the expected order", () => {
  assert.deepEqual(
    APP_STAGES.map((stage) => stage.id),
    ["upload", "analyzing", "result"],
  );
});

test("getStageForPath maps routes to the active stage", () => {
  assert.equal(getStageForPath("/"), "upload");
  assert.equal(getStageForPath("/upload"), "upload");
  assert.equal(getStageForPath("/analyzing"), "analyzing");
  assert.equal(getStageForPath("/result/abc"), "result");
});
