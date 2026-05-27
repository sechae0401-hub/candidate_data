export const COLOR_TOKENS: Record<string, string> = {
  canvas: "#FFFFFF",
  surface: "#F7F7F8",
  hairline: "#E5E7EB",
  "hairline-soft": "#F0F0F2",
  ink: "#111827",
  charcoal: "#374151",
  slate: "#6B7280",
  muted: "#9CA3AF",
  "status-done": "#10B981",
  "status-done-soft": "#F0FDF4",
  "status-review": "#F59E0B",
  "status-review-soft": "#FFFBEB",
  "status-error": "#EF4444",
  "status-error-soft": "#FEF2F2",
};

export const FONT_SIZE_TOKENS: Record<
  string,
  [string, { lineHeight: string; fontWeight: string }]
> = {
  "heading-page": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
  "heading-section": ["18px", { lineHeight: "1.4", fontWeight: "600" }],
  "heading-sub": ["16px", { lineHeight: "1.4", fontWeight: "500" }],
  body: ["15px", { lineHeight: "1.6", fontWeight: "400" }],
  table: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
  caption: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
  badge: ["12px", { lineHeight: "1.3", fontWeight: "500" }],
  button: ["14px", { lineHeight: "1.3", fontWeight: "500" }],
};

export const PRETENDARD_FONT_STACK: string[] = ["Pretendard", "system-ui", "sans-serif"];
