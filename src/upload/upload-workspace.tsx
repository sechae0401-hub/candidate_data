"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ColumnAnalysisItem } from "@/upload/column-analysis";
import { buildClassificationDraft, CLASSIFICATION_DRAFT_STORAGE_KEY } from "@/upload/classification-draft";
import { formatWorkbookSummary, getWorkbookFileError } from "@/upload/file-acceptance";
import { parseWorkbookFile } from "@/upload/parse-workbook";
import { countRowsForSelectedResultValues, getResultValueOptions } from "@/upload/result-selection";
import { SESSION_ID_STORAGE_KEY } from "@/shared/session/session-guard";
import { validateTemplateColumns, type TemplateValidationResult } from "@/upload/template-validation";
import type { WorkbookSnapshot } from "@/upload/types";

const TEMPLATE_DOWNLOAD_PATH = "/templates/cancellation-template.xlsx";

export function UploadWorkspace() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<WorkbookSnapshot | null>(null);
  const [validationResult, setValidationResult] = useState<TemplateValidationResult | null>(null);
  const [isAnalyzingColumns, setIsAnalyzingColumns] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [columnAnalyses, setColumnAnalyses] = useState<ColumnAnalysisItem[]>([]);
  const [isAnalysisApproved, setIsAnalysisApproved] = useState(false);
  const [selectedResultValues, setSelectedResultValues] = useState<string[]>([]);
  const [cohortName, setCohortName] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const analysisAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      analysisAbortRef.current?.abort();
    };
  }, []);

  const summaryText = useMemo(() => {
    if (!selectedFileName || !snapshot) {
      return null;
    }

    return formatWorkbookSummary(selectedFileName, snapshot.totalRows);
  }, [selectedFileName, snapshot]);

  const resultValueOptions = useMemo(() => {
    if (!snapshot || !isAnalysisApproved) {
      return [];
    }

    return getResultValueOptions(snapshot);
  }, [isAnalysisApproved, snapshot]);

  const selectedRowCount = useMemo(() => {
    if (!snapshot) {
      return 0;
    }

    return countRowsForSelectedResultValues(snapshot, selectedResultValues);
  }, [selectedResultValues, snapshot]);

  async function handleWorkbookSelection(file: File | null) {
    if (!file) {
      return;
    }

    const fileError = getWorkbookFileError(file);

    if (fileError) {
      setSnapshot(null);
      setSelectedFileName(null);
      setValidationResult(null);
      setColumnAnalyses([]);
      setAnalysisError(null);
      setIsAnalysisApproved(false);
      setSelectedResultValues([]);
      setCohortName("");
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
      const nextValidationResult = validateTemplateColumns(nextSnapshot.columns);

      startTransition(() => {
        setSelectedFileName(file.name);
        setSnapshot(nextSnapshot);
        setValidationResult(nextValidationResult);
        setErrorMessage(null);
        setColumnAnalyses([]);
        setAnalysisError(null);
        setIsAnalysisApproved(false);
        setSelectedResultValues([]);
        setCohortName("");
      });

      if (nextValidationResult.status === "valid") {
        await runColumnAnalysis(nextSnapshot);
      }
    } catch (error) {
      console.error("Workbook parsing failed:", error);

      const fallbackMessage = "엑셀 파일을 읽는 중 오류가 발생했습니다. 다시 시도해 주세요";
      setSnapshot(null);
      setSelectedFileName(null);
      setValidationResult(null);
      setColumnAnalyses([]);
      setAnalysisError(null);
      setIsAnalysisApproved(false);
      setSelectedResultValues([]);
      setCohortName("");
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

  async function runColumnAnalysis(currentSnapshot: WorkbookSnapshot) {
    analysisAbortRef.current?.abort();
    const controller = new AbortController();
    analysisAbortRef.current = controller;

    setIsAnalyzingColumns(true);
    setAnalysisError(null);
    setColumnAnalyses([]);
    setIsAnalysisApproved(false);
    setSelectedResultValues([]);

    try {
      const response = await fetch("/api/upload/analyze-columns", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          columns: currentSnapshot.columns,
          sampleRows: currentSnapshot.rows.slice(0, 3),
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as {
        columnAnalyses?: ColumnAnalysisItem[];
        error?: string;
      };

      if (!response.ok || !payload.columnAnalyses) {
        throw new Error(payload.error ?? "AI 분석 중 오류가 발생했습니다.");
      }

      setColumnAnalyses(payload.columnAnalyses);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      console.error("Column analysis failed:", error);

      const fallbackMessage = "AI 분석 중 오류가 발생했습니다. 다시 시도해 주세요";
      setAnalysisError(fallbackMessage);
      toast({
        title: "AI 분석을 완료하지 못했습니다",
        description: fallbackMessage,
        variant: "error",
      });
    } finally {
      if (!controller.signal.aborted) {
        setIsAnalyzingColumns(false);
      }
    }
  }

  async function handleCreateSession() {
    if (!snapshot || selectedRowCount === 0) {
      return;
    }

    setIsCreatingSession(true);

    try {
      const normalizedCohortName = cohortName.trim() || null;
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          cohortName: normalizedCohortName,
          totalRows: snapshot.totalRows,
          excludedRows: snapshot.totalRows - selectedRowCount,
          selectedResultValues,
        }),
      });
      const payload = (await response.json()) as { sessionId?: string; error?: string };

      if (!response.ok || !payload.sessionId) {
        throw new Error(payload.error ?? "분류 세션을 만들지 못했습니다.");
      }

      const classificationDraft = buildClassificationDraft({
        sessionId: payload.sessionId,
        cohortName: normalizedCohortName,
        selectedResultValues,
        snapshot,
      });

      window.localStorage.setItem(SESSION_ID_STORAGE_KEY, payload.sessionId);
      window.localStorage.setItem(CLASSIFICATION_DRAFT_STORAGE_KEY, JSON.stringify(classificationDraft));
      toast({
        title: "분류 세션을 준비했습니다",
        description: `분류 대상 ${selectedRowCount}건으로 다음 단계로 이동합니다.`,
      });
      router.push("/analyzing");
    } catch (error) {
      console.error("Create session failed:", error);

      toast({
        title: "분류를 시작하지 못했습니다",
        description: "분류 시작 준비 중 오류가 발생했습니다.",
        variant: "error",
      });
    } finally {
      setIsCreatingSession(false);
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

                  {validationResult ? (
                    <div
                      className={cn(
                        "rounded-3xl border p-4",
                        validationResult.status === "valid"
                          ? "border-status-done bg-status-done-soft"
                          : "border-status-error bg-status-error-soft",
                      )}
                    >
                      <p className="text-button text-ink">{validationResult.message}</p>
                      <p className="mt-1 text-caption text-slate">
                        {validationResult.status === "valid"
                          ? "필수 컬럼 확인이 끝났습니다. 다음 Story에서 AI 컬럼 분석이 이 상태를 이어받습니다."
                          : "양식 다운로드 버튼으로 다시 양식을 받아 컬럼명을 맞춘 뒤 재업로드해 주세요."}
                      </p>
                    </div>
                  ) : null}

                  {isAnalyzingColumns ? (
                    <div className="rounded-3xl border border-hairline bg-white p-4">
                      <p className="text-button text-ink">AI가 파일을 분석하고 있습니다...</p>
                      <p className="mt-1 text-caption text-slate">
                        검증을 통과한 컬럼 구조를 GPT-5.5가 읽고 있습니다. 잠시만 기다려 주세요.
                      </p>
                    </div>
                  ) : null}

                  {analysisError ? (
                    <div className="rounded-3xl border border-status-error bg-status-error-soft p-4">
                      <p className="text-button text-ink">{analysisError}</p>
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            if (snapshot) {
                              void runColumnAnalysis(snapshot);
                            }
                          }}
                        >
                          다시 분석
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {columnAnalyses.length > 0 ? (
                    <div className="rounded-3xl border border-hairline bg-white p-4">
                      <div className="space-y-4">
                        <div>
                          <p className="text-button text-ink">AI가 이렇게 이해했습니다</p>
                          <p className="mt-1 text-caption text-slate">
                            컬럼 이해가 맞는지 확인한 뒤 승인해야 다음 단계가 열립니다.
                          </p>
                        </div>
                        <div className="overflow-hidden rounded-3xl border border-hairline">
                          <table className="min-w-full border-collapse">
                            <thead className="bg-surface">
                              <tr>
                                <th className="px-4 py-3 text-left text-caption text-slate">컬럼명</th>
                                <th className="px-4 py-3 text-left text-caption text-slate">AI의 이해</th>
                              </tr>
                            </thead>
                            <tbody>
                              {columnAnalyses.map((analysis) => (
                                <tr key={analysis.columnName} className="border-t border-hairline">
                                  <td className="px-4 py-3 text-button text-ink">{analysis.columnName}</td>
                                  <td className="px-4 py-3 text-caption text-slate">{analysis.understanding}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            type="button"
                            onClick={() => {
                              setIsAnalysisApproved(true);
                              setSelectedResultValues([]);
                            }}
                          >
                            이 내용으로 진행
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              if (snapshot) {
                                void runColumnAnalysis(snapshot);
                              }
                            }}
                          >
                            다시 분석
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

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
              <CardTitle>취소 대상 선택 및 분류 실행</CardTitle>
              <CardDescription>AI 컬럼 분석을 승인하면 분류 대상을 선택하고 분류를 시작할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isAnalysisApproved && snapshot ? (
                <div className="rounded-3xl border border-hairline bg-white p-4">
                  <div className="space-y-4">
                    <div>
                      <p className="text-button text-ink">취소 대상 선택</p>
                      <p className="mt-1 text-caption text-slate">
                        최종결과 컬럼 값 중 분류 대상으로 포함할 항목을 선택해 주세요.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {resultValueOptions.map((option) => {
                        const isChecked = selectedResultValues.includes(option.value);

                        return (
                          <label
                            key={option.value}
                            className="flex items-center justify-between rounded-2xl border border-hairline bg-surface px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  setSelectedResultValues((currentValues) => {
                                    if (checked) {
                                      return [...currentValues, option.value];
                                    }

                                    return currentValues.filter((value) => value !== option.value);
                                  });
                                }}
                              />
                              <div>
                                <p className="text-button text-ink">{option.value}</p>
                                <p className="text-caption text-slate">{option.count}건</p>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="rounded-2xl border border-hairline bg-surface p-4">
                      <p className="text-button text-ink">분류 대상 {selectedRowCount}건</p>
                      <p className="mt-1 text-caption text-slate">
                        취소 관련 항목을 하나 이상 선택해 주세요.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-button text-ink" htmlFor="cohort-name">
                        기수명
                      </label>
                      <input
                        id="cohort-name"
                        className="w-full rounded-full border border-hairline px-4 py-3 text-body text-ink outline-none transition-colors focus:border-ink"
                        maxLength={120}
                        placeholder="예: 3기"
                        value={cohortName}
                        onChange={(event) => {
                          setCohortName(event.target.value);
                        }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={selectedRowCount === 0 || isCreatingSession}
                        type="button"
                        onClick={() => {
                          void handleCreateSession();
                        }}
                      >
                        {isCreatingSession ? "분류 준비 중..." : "분류 실행"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-hairline bg-white p-4">
                  <p className="text-button text-ink">분류 실행 상태</p>
                  <p className="mt-1 text-caption text-slate">
                    {validationResult?.status === "valid"
                      ? "양식 검증까지 완료되었습니다. AI 컬럼 분석을 승인하면 취소 대상 선택 카드가 열립니다."
                      : "양식 검증을 통과하기 전에는 분류 실행 버튼이 비활성화됩니다."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button disabled type="button">
                      분류 실행
                    </Button>
                    {validationResult?.status !== "valid" ? (
                      <Button asChild type="button" variant="secondary">
                        <a download href={TEMPLATE_DOWNLOAD_PATH}>
                          양식 다시 다운로드
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
