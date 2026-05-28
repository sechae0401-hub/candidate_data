"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { SESSION_ID_STORAGE_KEY } from "@/shared/session/session-guard";
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
  const [data, setData] = useState<ResultApiPayload | null>(null);
  const [rows, setRows] = useState<ResultRowSummary[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: EditableResultField } | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const summary = useMemo(() => calculateResultSummary(rows), [rows]);
  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedRowId) ?? null, [rows, selectedRowId]);

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
        <header className="flex flex-col gap-2">
          <p className="text-heading-page text-ink">취소 사유 분류 결과</p>
          <p className="text-caption text-slate">
            {data.session.cohort_name ? `${data.session.cohort_name} · ` : ""}
            분류 완료 데이터를 검토 필요 상태별로 확인합니다.
          </p>
        </header>

        <section className="flex flex-wrap items-center gap-3 border-y border-hairline bg-surface px-6 py-4">
          <Badge>전체 {summary.totalCount}건</Badge>
          <Badge variant="review">검토 필요 {summary.reviewCount}건</Badge>
          <Badge variant="done">완료 {summary.completedCount}건</Badge>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-xl border border-hairline bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full border-collapse text-table">
              <thead className="bg-surface text-left text-badge text-slate">
                <tr>
                  <th className="px-4 py-3 font-medium">행</th>
                  <th className="px-4 py-3 font-medium">인터뷰 내용</th>
                  <th className="px-4 py-3 font-medium">1차 원인</th>
                  <th className="px-4 py-3 font-medium">2차 행동</th>
                  <th className="px-4 py-3 font-medium">세부 태그</th>
                  <th className="px-4 py-3 font-medium">타 과정명</th>
                  <th className="px-4 py-3 font-medium">판단 근거</th>
                  <th className="px-4 py-3 font-medium">상태</th>
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
                      <td className="whitespace-nowrap px-4 py-3">
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>

          <OriginalSourcePanel selectedRow={selectedRow} />
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

function OriginalSourcePanel({ selectedRow }: { selectedRow: ResultRowSummary | null }) {
  if (!selectedRow) {
    return (
      <aside className="rounded-xl border border-hairline bg-white p-6">
        <p className="text-heading-sub text-ink">원문</p>
        <p className="mt-2 text-body text-slate">행을 선택하면 인터뷰 내용과 특이사항 전문이 표시됩니다.</p>
      </aside>
    );
  }

  return (
    <aside className="rounded-xl border border-hairline bg-white p-6 lg:sticky lg:top-24 lg:self-start">
      <div className="flex items-center justify-between gap-3">
        <p className="text-heading-sub text-ink">원문</p>
        <Badge>행 {selectedRow.rowIndex}</Badge>
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
