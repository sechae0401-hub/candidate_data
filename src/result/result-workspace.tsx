"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SESSION_ID_STORAGE_KEY } from "@/shared/session/session-guard";
import {
  buildInterviewSummary,
  calculateResultSummary,
  getResultReviewState,
  type ResultRowSummary,
} from "@/result/result-summary";

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

export function ResultWorkspace() {
  const [data, setData] = useState<ResultApiPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const rows = useMemo(() => (data?.results ?? []).map(mapResultRow), [data?.results]);
  const summary = useMemo(() => calculateResultSummary(rows), [rows]);

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

      setData(payload as ResultApiPayload);
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

        <section className="overflow-hidden rounded-xl border border-hairline bg-white">
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
                      className={cn(
                        "h-12 border-b border-hairline-soft border-l-4 text-charcoal",
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
                        <span className="block truncate">{displayValue(row.primaryCause)}</span>
                      </td>
                      <td className="max-w-[140px] px-4 py-3">
                        <span className="block truncate">{displayValue(row.secondaryAction)}</span>
                      </td>
                      <td className="max-w-[140px] px-4 py-3">
                        <span className="block truncate">{displayValue(row.detailTags)}</span>
                      </td>
                      <td className="max-w-[120px] px-4 py-3">
                        <span className="block truncate">{displayValue(row.competingCourse)}</span>
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <span className="block truncate">{displayValue(row.reasoning)}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ResultStatusBadge row={row} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
