import test from "node:test";
import assert from "node:assert/strict";

import tailwindConfig from "../tailwind.config";
import { COLOR_TOKENS, FONT_SIZE_TOKENS, PRETENDARD_FONT_STACK } from "../src/shared/utils/design-tokens";

test("design tokens expose the required color palette", () => {
  assert.equal(COLOR_TOKENS.ink, "#111827");
  assert.equal(COLOR_TOKENS.surface, "#F7F7F8");
  assert.equal(COLOR_TOKENS.hairline, "#E5E7EB");
  assert.equal(COLOR_TOKENS["status-done"], "#10B981");
  assert.equal(COLOR_TOKENS["status-review"], "#F59E0B");
  assert.equal(COLOR_TOKENS["status-error"], "#EF4444");
});

test("tailwind config wires typography and font stack", () => {
  assert.deepEqual(PRETENDARD_FONT_STACK, ["Pretendard", "system-ui", "sans-serif"]);
  assert.deepEqual(FONT_SIZE_TOKENS["heading-page"], ["24px", { lineHeight: "1.3", fontWeight: "600" }]);
  assert.deepEqual(FONT_SIZE_TOKENS.body, ["15px", { lineHeight: "1.6", fontWeight: "400" }]);

  const theme = tailwindConfig.theme as {
    extend: {
      colors: { ink: string };
      fontFamily: { sans: string[] };
      fontSize: { badge: [string, { lineHeight: string; fontWeight: string }] };
    };
  };
  assert.ok(theme && "extend" in theme);
  assert.deepEqual(theme.extend.fontFamily.sans, PRETENDARD_FONT_STACK);
  assert.deepEqual(theme.extend.colors.ink, "#111827");
  assert.deepEqual(theme.extend.fontSize.badge, ["12px", { lineHeight: "1.3", fontWeight: "500" }]);
});

test("tailwind content includes the src directory", () => {
  assert.deepEqual(tailwindConfig.content, ["./src/**/*.{ts,tsx,mdx}"]);
});
