"use client";

import { startTransition, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, UploadCloud } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatWorkbookSummary, getWorkbookFileError } from "@/upload/file-acceptance";
import { parseWorkbookFile } from "@/upload/parse-workbook";
import type { WorkbookSnapshot } from "@/upload/types";

const TEMPLATE_DOWNLOAD_PATH = "/template/취소사유분석기_양식.xlsx";

export function UploadWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<WorkbookSnapshot | null>(null);

  const summaryText = useMemo(() => {
    if (!selectedFileName || !snapshot) {
      return null;
    }

    return formatWorkbookSummary(selectedFileName, snapshot.totalRows);
  }, [selectedFileName, snapshot]);

  async function handleWorkbookSelection(file: File | null) {
    if (!file) {
      return;
    }

    const fileError = getWorkbookFileError(file);

    if (fileError) {
      setSnapshot(null);
      setSelectedFileName(null);
      setErrorMessage(fileError);
      toast({
        title: "업로드 파일을 확인해 주세요",
        description: fileError,
        variant: "error",
      });
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const nextSnapshot = await parseWorkbookFile(file);

      startTransition(() => {
        setSelectedFileName(file.name);
        setSnapshot(nextSnapshot);
      });
    } catch (error) {
      console.error("Workbook parsing failed:", error);

      const fallbackMessage = "엑셀 파일을 읽는 중 오류가 발생했습니다. 다시 시도해 주세요";
      setSnapshot(null);
      setSelectedFileName(null);
      setErrorMessage(fallbackMessage);
      toast({
        title: "파일을 읽지 못했습니다",
        description: fallbackMessage,
        variant: "error",
      });
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <main className="px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-[28px] border border-hairline bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Badge>업로드 시작</Badge>
            <h1 className="text-heading-page text-ink">분석용 양식을 내려받고 파일을 업로드해 주세요</h1>
            <p className="max-w-2xl text-body text-slate">
              채매니저가 가장 먼저 거치는 화면입니다. 양식을 다운로드한 뒤 데이터를 채우고, 같은 화면에서 바로 업로드를 이어갈 수 있도록 구성합니다.
            </p>
          </div>
          <Button asChild type="button">
            <a download href={TEMPLATE_DOWNLOAD_PATH}>
              <Download className="mr-2 h-4 w-4" />
              분석용 엑셀 양식 다운로드
            </a>
          </Button>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>처음이라면 이 순서로 시작해 주세요</CardTitle>
              <CardDescription>①양식 다운로드 → ②데이터 입력 → ③파일 업로드</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["01", "양식 다운로드", "고정 양식을 내려받아 필요한 컬럼을 그대로 유지합니다."],
                  ["02", "데이터 입력", "취소자 데이터를 양식에 맞춰 정리하고 저장합니다."],
                  ["03", "파일 업로드", "드래그앤드롭 또는 파일 선택으로 업로드를 시작합니다."],
                ].map(([step, title, description]) => (
                  <div key={step} className="rounded-3xl border border-hairline bg-surface p-4">
                    <p className="text-badge text-slate">{step}</p>
                    <p className="mt-3 text-heading-sub text-ink">{title}</p>
                    <p className="mt-2 text-caption text-slate">{description}</p>
                  </div>
                ))}
              </div>

              <div
                className={cn(
                  "rounded-[28px] border border-dashed p-6 transition-colors",
                  isDragging ? "border-ink bg-surface" : "border-hairline bg-white",
                )}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  void handleWorkbookSelection(event.dataTransfer.files.item(0));
                }}
              >
                <input
                  ref={inputRef}
                  accept=".xlsx,.xls"
                  className="hidden"
                  type="file"
                  onChange={(event) => {
                    void handleWorkbookSelection(event.target.files?.item(0) ?? null);
                  }}
                />

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <p className="text-heading-sub text-ink">xlsx 또는 xls 파일을 이곳에 놓아 주세요</p>
                    <p className="text-body text-slate">
                      클릭해서 파일을 고르거나, 준비된 엑셀 파일을 끌어다 놓으면 총 행 수를 바로 확인합니다.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      inputRef.current?.click();
                    }}
                  >
                    파일 선택
                  </Button>
                </div>

                <div className="mt-6 space-y-3">
                  {summaryText ? (
                    <div className="rounded-3xl border border-status-done bg-status-done-soft p-4">
                      <div className="flex items-start gap-3">
                        <FileSpreadsheet className="mt-0.5 h-5 w-5 text-status-done" />
                        <div className="space-y-1">
                          <p className="text-button text-ink">{summaryText}</p>
                          <p className="text-caption text-slate">
                            첫 번째 시트 기준으로 읽었습니다. 다음 Story에서 양식 검증과 AI 컬럼 분석이 이어집니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-hairline bg-surface p-4 text-caption text-slate">
                      아직 업로드된 파일이 없습니다. 양식을 다운로드하고 데이터를 입력한 뒤 업로드해 주세요.
                    </div>
                  )}

                  {errorMessage ? (
                    <div className="rounded-3xl border border-status-error bg-status-error-soft p-4 text-caption text-charcoal">
                      {errorMessage}
                    </div>
                  ) : null}

                  {isParsing ? (
                    <div className="rounded-3xl border border-hairline bg-white p-4 text-caption text-slate">
                      파일을 읽고 있습니다. 잠시만 기다려 주세요.
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>다음 단계 예고</CardTitle>
              <CardDescription>Epic 2의 다음 Story에서 이 영역이 순서대로 채워집니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "양식 자동 검증",
                "AI 전체 컬럼 분석",
                "취소 대상 선택과 분류 실행",
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-hairline bg-surface px-4 py-3">
                  <p className="text-button text-ink">{item}</p>
                  <p className="mt-1 text-caption text-slate">현재 Story에서는 진입 흐름과 업로드 결과 표시만 먼저 완성합니다.</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

