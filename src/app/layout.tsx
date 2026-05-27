import type { Metadata } from "next";
import "@fontsource/pretendard/400.css";
import "@fontsource/pretendard/500.css";
import "@fontsource/pretendard/600.css";

import "@/app/globals.css";
import { AppFrame } from "@/components/app-frame";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "취소사유분석기",
  description: "업로드부터 분류 결과 검토까지 이어지는 취소 사유 분석 도구",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="bg-canvas font-sans text-body text-charcoal antialiased">
        <AppFrame>{children}</AppFrame>
        <Toaster />
      </body>
    </html>
  );
}
