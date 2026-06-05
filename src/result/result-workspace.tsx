"use client";

import { AlertTriangle, BarChart3, Copy, RefreshCw, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  buildNewCategorySummary,
  buildNotionMarkdown,
  canCopyToNotion,
  parseStoredInsightSummary,
  type NewCategoryDisplayItem,
} from "@/result/notion-export";
import { getResultActionModes } from "@/result/result-actions";
import { SESSION_ID_STORAGE_KEY } from "@/shared/session/session-guard";
import { CLASSIFICATION_DRAFT_STORAGE_KEY } from "@/shared/types/classification-draft";
import {
  buildInterviewSummary,
  calculateResultSummary,
  getResultReviewState,
  type ResultRowSummary,
} from "@/result/result-summary";
import {
  applyResultRowPatch,
  buildEditableFieldPatch,
  buildReviewStatePatch,
  type EditableResultField,
  type ResultRowPatch,
} from "@/result/result-update";

interface ResultSessionPayload {
  id: string;
  status: string;
  cohort_name: string | null;
  total_rows: number;
  excluded_rows: number;
  analyzed_at: string | null;
  insight_summary: string | null;
}

interface ResultRowPayload {
  id: string;
  row_index: number;
  interview_content: string | null;
  notes: string | null;
  primary_cause: string | null;
  secondary_action: string | null;
  detail_tags: string | null;
  competing_course: string | null;
  reasoning: string | null;
  needs_review: boolean;
  review_completed: boolean;
}

interface ResultApiPayload {
  session: ResultSessionPayload;
  results: ResultRowPayload[];
  newCategories: Array<{
    id: string;
    session_id: string;
    category_name: string;
    occurrence_count: number;
  }>;
}

function mapResultRow(row: ResultRowPayload): ResultRowSummary {
  return {
    id: row.id,
    rowIndex: row.row_index,
    interviewContent: row.interview_content,
    notes: row.notes,
    primaryCause: row.primary_cause,
    secondaryAction: row.secondary_action,
    detailTags: row.detail_tags,
    competingCourse: row.competing_course,
    reasoning: row.reasoning,
    needsReview: row.needs_review,
    reviewCompleted: row.review_completed,
  };
}

function displayValue(value: string | null) {
  return value?.trim() || "-";
}

interface TagWithCount {
  tag: string;
  count: number;
}

function buildTagsByPrimaryCause(rows: ResultRowSummary[]): Map<string, TagWithCount[]> {
  const countMap = new Map<string, Map<string, number>>();
  const skipTags = new Set(["정보 부족", "API 오류", "검토 필요", "-"]);

  for (const row of rows) {
    const cause = row.primaryCause?.trim();
    if (!cause) continue;

    const tags = (row.detailTags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !skipTags.has(t));

    if (tags.length === 0) continue;

    if (!countMap.has(cause)) countMap.set(cause, new Map());
    const tagCounts = countMap.get(cause)!;

    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const result = new Map<string, TagWithCount[]>();
  for (const [cause, tagCounts] of countMap) {
    result.set(
      cause,
      [...tagCounts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count),
    );
  }

  return result;
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Continue to the textarea fallback below.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  const didCopy = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!didCopy) {
    throw new Error("Clipboard copy failed");
  }
}

function ResultStatusBadge({ row }: { row: ResultRowSummary }) {
  const state = getResultReviewState(row);

  if (state === "review") {
    return <Badge variant="review">검토 필요</Badge>;
  }

  return <Badge variant="done">완료</Badge>;
}

function getEditableValue(row: ResultRowSummary, field: EditableResultField) {
  return row[field] ?? "";
}

export function ResultWorkspace() {
  const router = useRouter();
  const [data, setData] = useState<ResultApiPayload | null>(null);
  const [rows, setRows] = useState<ResultRowSummary[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: EditableResultField } | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const [hasCopiedToNotion, setHasCopiedToNotion] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const summary = useMemo(() => calculateResultSummary(rows), [rows]);
  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedRowId) ?? null, [rows, selectedRowId]);
  const insight = useMemo(() => parseStoredInsightSummary(data?.session.insight_summary ?? null), [data?.session.insight_summary]);
  const tagsByPrimaryCause = useMemo(() => buildTagsByPrimaryCause(rows), [rows]);
  const newCategoryItems = useMemo<NewCategoryDisplayItem[]>(
    () =>
      (data?.newCategories ?? []).map((category) => ({
        categoryName: category.category_name,
        occurrenceCount: category.occurrence_count,
      })),
    [data?.newCategories],
  );
  const newCategorySummary = useMemo(() => buildNewCategorySummary(newCategoryItems), [newCategoryItems]);
  const copyEnabled = canCopyToNotion(summary);
  const actionModes = getResultActionModes(hasCopiedToNotion);

  const saveRowPatch = useCallback(
    async (rowId: string, patch: ResultRowPatch) => {
      if (!data) {
        return;
      }

      const previousRows = rows;

      setRows((currentRows) =>
        currentRows.map((row) => (row.id === rowId ? applyResultRowPatch(row, patch) : row)),
      );

      try {
        const response = await fetch(`/api/result/${data.session.id}/update`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resultId: rowId,
            ...patch,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "수정 내용을 저장하지 못했습니다.");
        }
      } catch {
        setRows(previousRows);
        toast({
          title: "저장 실패",
          description: "수정 내용을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요",
          variant: "error",
        });
      }
    },
    [data, rows, toast],
  );

  const startEditing = useCallback((row: ResultRowSummary, field: EditableResultField) => {
    setSelectedRowId(row.id);
    setEditingCell({ rowId: row.id, field });
    setDraftValue(getEditableValue(row, field));
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingCell(null);
    setDraftValue("");
  }, []);

  const commitEditing = useCallback(async () => {
    if (!editingCell) {
      return;
    }

    const { rowId, field } = editingCell;
    const currentRow = rows.find((row) => row.id === rowId);
    const previousValue = currentRow ? getEditableValue(currentRow, field).trim() : "";
    const nextValue = draftValue.trim();

    cancelEditing();

    if (previousValue === nextValue) {
      return;
    }

    await saveRowPatch(rowId, buildEditableFieldPatch(field, draftValue));
  }, [cancelEditing, draftValue, editingCell, rows, saveRowPatch]);

  const loadResult = useCallback(async () => {
    const sessionId = window.localStorage.getItem(SESSION_ID_STORAGE_KEY);

    if (!sessionId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/result/${sessionId}`);
      const payload = (await response.json()) as ResultApiPayload | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "분류 결과를 불러오지 못했습니다.");
      }

      const nextData = payload as ResultApiPayload;
      const nextRows = nextData.results.map(mapResultRow);

      setData(nextData);
      setRows(nextRows);
      setSelectedRowId((currentSelectedRowId) => currentSelectedRowId ?? nextRows[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "분류 결과를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const copyNotionMarkdown = useCallback(async () => {
    if (!data || !copyEnabled) {
      return;
    }

    setIsCopying(true);

    try {
      await copyTextToClipboard(
        buildNotionMarkdown({
          rows,
          insight,
          cohortName: data.session.cohort_name,
        }),
      );
      toast({
        title: "복사되었습니다",
        description: "노션에 바로 붙여넣을 수 있는 형식으로 복사했습니다.",
      });
      setHasCopiedToNotion(true);
    } catch {
      toast({
        title: "복사 실패",
        description: "HTTPS 환경에서만 복사가 지원됩니다. 브라우저 권한을 확인해 주세요.",
        variant: "error",
      });
    } finally {
      setIsCopying(false);
    }
  }, [copyEnabled, data, insight, rows, toast]);

  const startNewClassification = useCallback(() => {
    window.localStorage.removeItem(SESSION_ID_STORAGE_KEY);
    window.localStorage.removeItem(CLASSIFICATION_DRAFT_STORAGE_KEY);
    router.push("/upload");
  }, [router]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  if (isLoading) {
    return (
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-xl border border-hairline bg-white p-8 text-center">
          <p className="text-heading-sub text-ink">분류 결과를 불러오고 있습니다</p>
          <p className="mt-2 text-body text-slate">저장된 세션과 결과 테이블을 확인하는 중입니다.</p>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 rounded-xl border border-hairline bg-white p-8">
          <div>
            <p className="text-heading-sub text-ink">결과를 불러오지 못했습니다</p>
            <p className="mt-2 text-body text-slate">{errorMessage}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void loadResult()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
        </div>
      </main>
    );
  }

  if (!data || rows.length === 0) {
    return (
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-xl border border-hairline bg-white p-8 text-center">
          <p className="text-heading-sub text-ink">분류 결과가 없습니다</p>
          <p className="mt-2 text-body text-slate">분류가 완료된 세션인지 확인해 주세요.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-heading-page text-ink">
              {data.session.cohort_name ? `${data.session.cohort_name} 취소 분석이 완료됐습니다` : "취소 분석이 완료됐습니다"}
            </p>
            <p className="text-caption text-slate">
              총 {summary.totalCount}건 분류 완료 · 검토 필요 {summary.reviewCount}건
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            onClick={() => router.push("/result/dashboard")}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            인사이트 대시보드 보기
          </Button>
        </header>

        <section className="flex flex-wrap items-center gap-3 border-y border-hairline bg-surface px-6 py-4">
          <Badge>전체 {summary.totalCount}건</Badge>
          <Badge variant="review">검토 필요 {summary.reviewCount}건</Badge>
          <Badge variant="done">완료 {summary.completedCount}건</Badge>
        </section>

        {summary.reviewCount === 0 ? (
          <p className="rounded-lg border border-status-done bg-status-done-soft px-4 py-2 text-caption text-slate">
            모든 항목이 자동으로 완료됐습니다. 바로 노션에 복사할 수 있어요.
          </p>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-xl border border-hairline bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-[1040px] w-full border-collapse text-table">
                <thead className="bg-surface text-left text-badge text-slate">
                  <tr>
                    <th className="sticky left-0 z-10 bg-surface px-4 py-3 font-medium">상태</th>
                    <th className="px-4 py-3 font-medium">행</th>
                    <th className="px-4 py-3 font-medium">인터뷰 내용</th>
                    <th className="px-4 py-3 font-medium">1차 원인</th>
                    <th className="px-4 py-3 font-medium">2차 행동</th>
                    <th className="px-4 py-3 font-medium">세부 태그</th>
                    <th className="px-4 py-3 font-medium">타 과정명</th>
                    <th className="px-4 py-3 font-medium">판단 근거</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const state = getResultReviewState(row);

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedRowId(row.id)}
                        className={cn(
                          "h-12 cursor-pointer border-b border-hairline-soft border-l-4 text-charcoal transition-colors",
                          selectedRowId === row.id && "outline outline-2 outline-offset-[-2px] outline-ink",
                          state === "review"
                            ? "border-l-status-review bg-status-review-soft"
                            : "border-l-status-done bg-status-done-soft",
                        )}
                      >
                        <td
                          className={cn(
                            "sticky left-0 z-10 whitespace-nowrap px-4 py-3",
                            state === "review" ? "bg-status-review-soft" : "bg-status-done-soft",
                          )}
                        >
                          <button
                            type="button"
                            className="inline-flex min-h-11 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                            onClick={(event) => {
                              event.stopPropagation();
                              const nextState = state === "review" ? "done" : "review";
                              void saveRowPatch(row.id, buildReviewStatePatch(nextState));
                            }}
                          >
                            <ResultStatusBadge row={row} />
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate">{row.rowIndex}</td>
                        <td className="max-w-[220px] px-4 py-3">
                          <span className="block truncate">{buildInterviewSummary(row)}</span>
                        </td>
                        <td className="max-w-[140px] px-4 py-3">
                          <EditableCell
                            field="primaryCause"
                            row={row}
                            editingCell={editingCell}
                            draftValue={draftValue}
                            onCancel={cancelEditing}
                            onCommit={commitEditing}
                            onDraftChange={setDraftValue}
                            onStartEditing={startEditing}
                          />
                        </td>
                        <td className="max-w-[140px] px-4 py-3">
                          <EditableCell
                            field="secondaryAction"
                            row={row}
                            editingCell={editingCell}
                            draftValue={draftValue}
                            onCancel={cancelEditing}
                            onCommit={commitEditing}
                            onDraftChange={setDraftValue}
                            onStartEditing={startEditing}
                          />
                        </td>
                        <td className="max-w-[140px] px-4 py-3">
                          <EditableCell
                            field="detailTags"
                            row={row}
                            editingCell={editingCell}
                            draftValue={draftValue}
                            onCancel={cancelEditing}
                            onCommit={commitEditing}
                            onDraftChange={setDraftValue}
                            onStartEditing={startEditing}
                          />
                        </td>
                        <td className="max-w-[120px] px-4 py-3">
                          <span className="block truncate">{displayValue(row.competingCourse)}</span>
                        </td>
                        <td className="max-w-[220px] px-4 py-3">
                          <span className="block truncate">{displayValue(row.reasoning)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <OriginalSourcePanel selectedRow={selectedRow} onClose={() => setSelectedRowId(null)} />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-heading-sub text-ink">인사이트</p>
            <p className="text-caption text-slate">AI가 이번 기수의 패턴을 요약했습니다.</p>
          </div>

          {/* A: AI 요약 callout */}
          <div className="rounded-xl border-l-4 border-l-blue-400 bg-blue-50 px-5 py-4">
            <p className="text-body text-charcoal">{insight.summary}</p>
          </div>

          {/* B: 1차 원인 — 전체 너비 + 막대 차트 */}
          <div className="rounded-xl border border-hairline bg-white p-5">
            <p className="mb-4 text-heading-sub text-ink">1차 원인</p>
            {insight.topPrimaryCauses.length > 0 ? (
              <div className="flex flex-col gap-4">
                {insight.topPrimaryCauses.map((item) => {
                  const tags = tagsByPrimaryCause.get(item.primaryCause) ?? [];
                  return (
                  <div key={item.primaryCause}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-body text-ink">{item.primaryCause}</span>
                      <span className="text-caption text-slate">{item.count}건 · {item.percentage}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-400"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    {tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tags.map(({ tag, count }) =>
                          count >= 2 ? (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-caption text-amber-800"
                            >
                              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                              {tag}
                            </span>
                          ) : (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-caption text-gray-600"
                            >
                              {tag}
                            </span>
                          ),
                        )}
                      </div>
                    ) : null}
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-body text-slate">데이터가 없습니다.</p>
            )}
          </div>

          {/* E: 2차 행동 + 타 과정 — 보조 정보 */}
          <div className={cn("grid gap-4", insight.competingCourses.length > 0 ? "lg:grid-cols-2" : "")}>
            <div className="rounded-xl border border-hairline bg-white p-5">
              <p className="mb-3 text-badge text-slate">2차 행동</p>
              {insight.topSecondaryActions.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-hairline">
                  <table className="min-w-full border-collapse text-body">
                    <thead className="bg-surface">
                      <tr>
                        <th className="px-4 py-2 text-left text-caption text-slate">행동</th>
                        <th className="px-4 py-2 text-right text-caption text-slate">건수</th>
                        <th className="px-4 py-2 text-right text-caption text-slate">비율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insight.topSecondaryActions.map((item) => (
                        <tr key={item.secondaryAction} className="border-t border-hairline">
                          <td className="px-4 py-2 text-ink">{item.secondaryAction}</td>
                          <td className="px-4 py-2 text-right text-charcoal">{item.count}</td>
                          <td className="px-4 py-2 text-right text-charcoal">{item.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-body text-slate">데이터가 없습니다.</p>
              )}
            </div>

            {insight.competingCourses.length > 0 ? (
              <div className="rounded-xl border border-hairline bg-white p-5">
                <p className="mb-1 text-badge text-slate">타 과정 선택 상세</p>
                <p className="mb-3 text-caption text-slate">
                  응답자 {insight.competingCourses.reduce((s, c) => s + c.count, 0)}명 기준
                </p>
                <div className="overflow-hidden rounded-xl border border-hairline">
                  <table className="min-w-full border-collapse text-body">
                    <thead className="bg-surface">
                      <tr>
                        <th className="px-4 py-2 text-left text-caption text-slate">과정명</th>
                        <th className="px-4 py-2 text-right text-caption text-slate">응답 수</th>
                        <th className="px-4 py-2 text-right text-caption text-slate">응답자 중 비율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insight.competingCourses.map((item) => (
                        <tr key={item.courseName} className="border-t border-hairline">
                          <td className="px-4 py-2 text-ink">{item.courseName}</td>
                          <td className="px-4 py-2 text-right text-charcoal">{item.count}</td>
                          <td className="px-4 py-2 text-right text-charcoal">{item.respondentPercentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          {/* C: 운영 추천 액션 — 카드 스타일 */}
          <div className="rounded-xl border border-hairline bg-white p-5">
            <p className="mb-3 text-heading-sub text-ink">운영 추천 액션</p>
            {insight.recommendedActions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {insight.recommendedActions.map((action, index) => (
                  <div key={action} className="flex gap-3 rounded-lg border border-hairline bg-surface px-4 py-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="text-body text-charcoal">{action}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body text-slate">추천 액션이 없습니다.</p>
            )}
          </div>

          {/* E: 이전 기수 비교 — 독립 카드 */}
          <div className="rounded-xl border border-hairline bg-white p-5">
            <p className="mb-3 text-badge text-slate">이전 기수 비교</p>
            {insight.cohortComparison.notice ? (
              <p className="text-body text-charcoal">{insight.cohortComparison.notice}</p>
            ) : (
              <ul className="space-y-2 text-body text-charcoal">
                {insight.cohortComparison.comparisons.map((item) => (
                  <li key={item.primaryCause}>
                    {item.primaryCause} {item.currentPercentage}% → 이전 평균 {item.previousAveragePercentage}% (
                    {item.deltaPercentagePoints > 0 ? "+" : ""}
                    {item.deltaPercentagePoints}%p)
                  </li>
                ))}
              </ul>
            )}
          </div>

          {newCategorySummary ? (
            <p className="rounded-lg border border-hairline bg-white px-5 py-4 text-body text-charcoal">
              {newCategorySummary}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-caption text-slate">
              {copyEnabled ? "검토가 완료되어 노션 형식으로 복사할 수 있습니다." : "검토 필요 행을 모두 완료하면 복사할 수 있습니다."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant={actionModes.copyButtonVariant}
                disabled={!copyEnabled || isCopying}
                onClick={() => void copyNotionMarkdown()}
              >
                <Copy className="mr-2 h-4 w-4" />
                노션 형식 복사
              </Button>
              <Button
                type="button"
                variant={actionModes.newStartButtonVariant}
                className={cn(hasCopiedToNotion && "ring-2 ring-ink ring-offset-2")}
                onClick={startNewClassification}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                새 분류 시작
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

interface EditableCellProps {
  row: ResultRowSummary;
  field: EditableResultField;
  editingCell: { rowId: string; field: EditableResultField } | null;
  draftValue: string;
  onCancel: () => void;
  onCommit: () => void;
  onDraftChange: (value: string) => void;
  onStartEditing: (row: ResultRowSummary, field: EditableResultField) => void;
}

function EditableCell({
  row,
  field,
  editingCell,
  draftValue,
  onCancel,
  onCommit,
  onDraftChange,
  onStartEditing,
}: EditableCellProps) {
  const isEditing = editingCell?.rowId === row.id && editingCell.field === field;

  if (isEditing) {
    return (
      <input
        autoFocus
        className="h-10 w-full rounded-md border border-hairline bg-white px-3 text-table text-ink outline-none focus:border-ink"
        value={draftValue}
        onBlur={() => void onCommit()}
        onChange={(event) => onDraftChange(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }

          if (event.key === "Escape") {
            event.stopPropagation();
            onCancel();
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="block min-h-11 w-full truncate rounded-md text-left text-table text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      onClick={(event) => {
        event.stopPropagation();
        onStartEditing(row, field);
      }}
    >
      {displayValue(getEditableValue(row, field))}
    </button>
  );
}

function OriginalSourcePanel({ selectedRow, onClose }: { selectedRow: ResultRowSummary | null; onClose: () => void }) {
  if (!selectedRow) {
    return (
      <aside className="hidden rounded-xl border border-hairline bg-white p-6 lg:block">
        <p className="text-heading-sub text-ink">원문</p>
        <p className="mt-2 text-body text-slate">행을 선택하면 인터뷰 내용과 특이사항 전문이 표시됩니다.</p>
      </aside>
    );
  }

  return (
    <aside className="fixed inset-x-0 bottom-0 z-50 max-h-[72vh] overflow-y-auto rounded-t-xl border border-hairline bg-white p-6 shadow-sm lg:sticky lg:inset-auto lg:top-24 lg:z-auto lg:max-h-none lg:self-start lg:rounded-xl lg:shadow-none">
      <div className="flex items-center justify-between gap-3">
        <p className="text-heading-sub text-ink">원문</p>
        <div className="flex items-center gap-2">
          <Badge>행 {selectedRow.rowIndex}</Badge>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-slate lg:hidden"
            onClick={onClose}
            aria-label="원문 패널 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <section>
          <p className="text-badge text-slate">인터뷰 내용</p>
          <p className="mt-2 whitespace-pre-wrap text-body text-charcoal">
            {selectedRow.interviewContent?.trim() || "인터뷰 내용이 없습니다."}
          </p>
        </section>

        <section>
          <p className="text-badge text-slate">특이사항</p>
          <p className="mt-2 whitespace-pre-wrap text-body text-charcoal">
            {selectedRow.notes?.trim() || "특이사항이 없습니다."}
          </p>
        </section>
      </div>
    </aside>
  );
}
