import Link from "next/link";

import { AppShellPreview } from "@/components/app-shell-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <section className="space-y-4">
          <Badge>Story 1.1</Badge>
          <div className="space-y-3">
            <h1 className="text-heading-page text-ink">취소사유분석기 프론트엔드 기반</h1>
            <p className="text-body text-slate">
              Next.js 14 App Router, Tailwind CSS, shadcn/ui 패턴, Pretendard 폰트, 그리고 공통 디자인 토큰이 연결된 기본 화면입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/upload">업로드 화면 자리 보기</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/analyzing">분류 중 화면 자리 보기</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/result">결과 화면 자리 보기</Link>
            </Button>
          </div>
        </section>
        <AppShellPreview />
      </div>
    </main>
  );
}
