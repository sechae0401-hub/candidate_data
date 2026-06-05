import test from "node:test";
import assert from "node:assert/strict";

import { getResultActionModes } from "../src/result/result-actions";

test("getResultActionModes promotes new classification after a successful copy", () => {
  assert.deepEqual(getResultActionModes(false), {
    copyButtonVariant: "default",
    newStartButtonVariant: "secondary",
  });
  assert.deepEqual(getResultActionModes(true), {
    copyButtonVariant: "secondary",
    newStartButtonVariant: "default",
  });
});
