"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";

const workflowSteps = [
  "양식 다운로드",
  "파일 업로드",
  "AI 컬럼 분석",
  "결과 검토",
] as const;

export function AppShellPreview() {
  const [checked, setChecked] = useState(true);
  const { toast } = useToast();

  return (
    <Card className="border-2 border-hairline">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="done">완료</Badge>
          <Badge variant="review">검토 필요</Badge>
          <Badge variant="error">오류</Badge>
        </div>
        <CardTitle>프론트엔드 기반 미리보기</CardTitle>
        <CardDescription>
          Story 1.1에서 필요한 디자인 토큰과 shadcn/ui 기반 컴포넌트가 올바르게 연결되었는지 확인하는 샘플 영역입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3">
          {workflowSteps.map((step, index) => (
            <div
              key={step}
              className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-3"
            >
              <div>
                <p className="text-heading-sub text-ink">{index + 1}. {step}</p>
                <p className="text-caption text-slate">단계별 카드 흐름을 위한 플레이스홀더</p>
              </div>
              <Badge variant={index < 2 ? "done" : "default"}>{index < 2 ? "준비됨" : "대기"}</Badge>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-heading-sub text-ink">분류 진행률</p>
              <p className="text-caption text-slate">8px 높이의 진행 바와 상태 색상을 사용합니다.</p>
            </div>
            <span className="text-badge text-slate">62%</span>
          </div>
          <Progress value={62} />
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-hairline p-4">
          <Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} />
          <div>
            <p className="text-body text-ink">최종결과 컬럼에서 취소 관련 항목 선택</p>
            <p className="text-caption text-slate">향후 Story 2에서 실제 데이터와 연결됩니다.</p>
          </div>
        </label>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() =>
            toast({
              title: "토스트 컴포넌트 준비 완료",
              description: "Story 1.3의 세션 가드 안내 메시지에 재사용할 수 있습니다.",
            })
          }
        >
          토스트 확인
        </Button>
        <Button type="button" variant="secondary">
          양식 다운로드
        </Button>
        <Button type="button" variant="ghost">
          다음 Story 대기
        </Button>
      </CardFooter>
    </Card>
  );
}
