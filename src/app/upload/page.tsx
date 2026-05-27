import { AppShellPreview } from "@/components/app-shell-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UploadPage() {
  return (
    <main className="px-6 py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <section className="space-y-3">
          <Badge>시작 단계</Badge>
          <h1 className="text-heading-page text-ink">분석용 파일을 업로드해 주세요</h1>
          <p className="text-body text-slate">
            이 화면이 도구의 시작점입니다. 양식을 다운로드하고, 파일을 업로드하고, AI 컬럼 분석을 확인한 뒤 분류를 시작합니다.
          </p>
        </section>
        <Card>
          <CardHeader>
            <CardTitle>업로드 흐름 골격</CardTitle>
            <CardDescription>Story 2에서 실제 업로드/검증/컬럼 분석 기능이 이 카드들 안에 채워집니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-hairline bg-surface p-4">
              <p className="text-heading-sub text-ink">1. 양식 다운로드</p>
              <p className="text-caption text-slate">고정 양식을 내려받아 데이터를 정리합니다.</p>
            </div>
            <div className="rounded-xl border border-hairline bg-surface p-4">
              <p className="text-heading-sub text-ink">2. 파일 업로드</p>
              <p className="text-caption text-slate">xlsx/xls 파일을 업로드하고 양식 검증을 진행합니다.</p>
            </div>
            <div className="rounded-xl border border-hairline bg-surface p-4">
              <p className="text-heading-sub text-ink">3. AI 컬럼 분석 확인</p>
              <p className="text-caption text-slate">AI가 이해한 컬럼 결과를 검토한 뒤 다음 단계로 이동합니다.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button">양식 다운로드</Button>
              <Button type="button" variant="secondary">예시 업로드 영역</Button>
            </div>
          </CardContent>
        </Card>
        <AppShellPreview />
      </div>
    </main>
  );
}
