import { Progress } from "@/components/ui/progress";

export default function AnalyzingPage() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto max-w-2xl rounded-xl border border-hairline bg-white p-8 shadow-sm">
        <div className="space-y-4">
          <p className="text-heading-section text-ink">분류 진행 상태 자리</p>
          <p className="text-body text-slate">
            Story 3에서 실시간 진행률, 상태 메시지, 재시도 피드백을 이 화면에 연결합니다.
          </p>
          <Progress value={35} />
        </div>
      </div>
    </main>
  );
}
