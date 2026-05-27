import { SessionGuard } from "@/components/session-guard";
import { Progress } from "@/components/ui/progress";

export default function AnalyzingPage() {
  return (
    <SessionGuard>
      <main className="px-6 py-12">
        <div className="mx-auto max-w-2xl rounded-xl border border-hairline bg-white p-8 shadow-sm">
          <div className="space-y-4">
            <p className="text-heading-section text-ink">분류 진행 상태</p>
            <p className="text-body text-slate">
              세션이 있는 경우에만 이 화면에 머물 수 있습니다. Story 3에서 실시간 진행률과 상태 폴링이 연결됩니다.
            </p>
            <Progress value={35} />
          </div>
        </div>
      </main>
    </SessionGuard>
  );
}
