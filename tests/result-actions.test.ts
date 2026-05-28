import test from "node:test";
import assert from "node:assert/strict";

import { getResultActionModes, getSourcePanelLayoutMode } from "../src/result/result-actions";

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

test("getSourcePanelLayoutMode uses desktop side panel from 1024px", () => {
  assert.equal(getSourcePanelLayoutMode(375), "bottom-sheet");
  assert.equal(getSourcePanelLayoutMode(768), "bottom-sheet");
  assert.equal(getSourcePanelLayoutMode(1024), "side-panel");
});
