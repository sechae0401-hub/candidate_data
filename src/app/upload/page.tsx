import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>업로드 화면 준비 중</CardTitle>
            <CardDescription>
              Story 2에서 양식 다운로드, 파일 업로드, AI 컬럼 분석 흐름이 여기에 연결됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body text-slate">현재는 프론트엔드 기반과 디자인 시스템만 준비된 상태입니다.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
