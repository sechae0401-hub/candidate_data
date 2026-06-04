"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { APP_STAGES, getStageForPath } from "@/shared/navigation/stages";

export function AppFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const currentStage = getStageForPath(pathname);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-hairline bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <Link href="/upload" className="inline-flex items-center gap-2 text-heading-section text-ink">
              <span>🤖</span>
              <span>취소사유분석기</span>
            </Link>
            <p className="text-caption text-slate">업로드부터 결과 검토까지 한 흐름으로 이어지는 내부 분석 도구</p>
          </div>
          <nav aria-label="단계 진행" className="flex flex-wrap items-center gap-2">
            {APP_STAGES.map((stage, index) => {
              const isCurrent = stage.id === currentStage;
              const isDone = APP_STAGES.findIndex((item) => item.id === currentStage) > index;

              return (
                <Link
                  key={stage.id}
                  href={stage.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-badge transition-colors",
                    isCurrent && "border-ink bg-ink text-white",
                    isDone && "border-status-done bg-status-done-soft text-status-done",
                    !isCurrent && !isDone && "border-hairline bg-white text-slate",
                  )}
                >
                  <span>{index + 1}</span>
                  <span>{stage.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      {children}
      <footer className="px-6 pb-4 pt-2 text-center">
        <p className="text-caption text-slate opacity-50">© 2026 채승은</p>
      </footer>
    </div>
  );
}
