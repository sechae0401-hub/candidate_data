import type { Config } from "tailwindcss";

import {
  COLOR_TOKENS,
  FONT_SIZE_TOKENS,
  PRETENDARD_FONT_STACK,
} from "./src/shared/utils/design-tokens";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: COLOR_TOKENS,
      fontFamily: {
        sans: PRETENDARD_FONT_STACK,
      },
      fontSize: FONT_SIZE_TOKENS,
    },
  },
  plugins: [],
};

export default config;
