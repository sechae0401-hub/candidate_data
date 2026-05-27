import { SessionGuard } from "@/components/session-guard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResultPage() {
  return (
    <SessionGuard>
      <main className="px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <section className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-surface px-6 py-4">
            <Badge>전체 0건</Badge>
            <Badge variant="review">검토 필요 0건</Badge>
            <Badge variant="done">완료 0건</Badge>
          </section>
          <Card>
            <CardHeader>
              <CardTitle>결과 화면 골격</CardTitle>
              <CardDescription>
                세션이 있는 상태에서만 이 화면을 확인할 수 있습니다. Story 4에서 결과 테이블, 원문 패널, 인사이트 요약과 노션 복사 기능이 완성됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-table text-slate">현재는 레이아웃 토큰과 상태 배지 시스템만 미리 연결되어 있습니다.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </SessionGuard>
  );
}
