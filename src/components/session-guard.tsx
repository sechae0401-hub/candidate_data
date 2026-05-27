"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useToast } from "@/components/ui/use-toast";
import { shouldRedirectToUpload } from "@/shared/session/session-guard";

export function SessionGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const sessionId = window.localStorage.getItem("session_id");

    if (shouldRedirectToUpload(pathname, sessionId)) {
      toast({
        title: "세션이 없습니다",
        description: "먼저 파일을 업로드해 주세요",
        variant: "review",
      });
      router.replace("/upload");
      return;
    }

    setIsAllowed(true);
  }, [pathname, router, toast]);

  if (!isAllowed) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-xl border border-hairline bg-white p-8 text-center">
          <p className="text-heading-sub text-ink">세션 정보를 확인하고 있습니다</p>
          <p className="mt-2 text-body text-slate">필요한 정보가 없으면 업로드 화면으로 자동 이동합니다.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
