"use client";

import { ArrowLeft, Lightbulb, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SegmentInsight } from "@/result/dashboard-insight-ai";
import {
  buildHeadline,
  buildInflowBreakdown,
  buildStageBreakdown,
  type DashboardRow,
  type SegmentBreakdown,
} from "@/result/dashboard-insights";
import { SESSION_ID_STORAGE_KEY } from "@/shared/session/session-guard";

interface DashboardRowPayload {
  primary_cause: string | null;
  source_snapshot: Record<string, unknown> | null;
  needs_review: boolean;
  review_completed: boolean;
}

interface DashboardApiPayload {
  session: { cohort_name: string | null };
  results: DashboardRowPayload[];
}

type TabKey = "inflow" | "stage";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "inflow", label: "유입경로별" },
  { key: "stage", label: "단계별" },
];

function toDashboardRow(row: DashboardRowPayload): DashboardRow {
  return { primaryCause: row.primary_cause, source: row.source_snapshot };
}

function SegmentCard({ segment }: { segment: SegmentBreakdown }) {
  return (
    <div className="rounded-xl border border-hairline bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <span className="text-heading-sub text-ink">{segment.label}</span>
        <span className="text-caption text-slate">{segment.total}명</span>
      </div>

      {segment.topCauses.length > 0 ? (
        <div className="flex flex-col gap-4">
          {segment.topCauses.map((item) => (
            <div key={item.cause}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-body text-ink">{item.cause}</span>
                <span className="text-caption text-slate">
                  {item.count}명 · {item.percentage}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-400"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-body text-slate">표시할 사유가 없습니다.</p>
      )}
    </div>
  );
}

function insightCacheKey(sessionId: string, tab: TabKey) {
  return `dashboard_insight_${sessionId}_${tab}`;
}

function AiInsightCard({ insight }: { insight: SegmentInsight }) {
  return (
    <div className="rounded-xl border border-hairline bg-white p-5">
      <div className="mb-3">
        <span className="text-heading-sub text-ink">📍 {insight.segment}</span>
      </div>
      <dl className="flex flex-col gap-2.5">
        <div>
          <dt className="text-badge text-slate">관찰</dt>
          <dd className="text-body text-charcoal">{insight.observation}</dd>
        </div>
        <div>
          <dt className="text-badge text-slate">추정 원인</dt>
          <dd className="text-body text-charcoal">{insight.hypothesis}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-badge text-blue-600">
            <Lightbulb className="h-3.5 w-3.5" />
            추천 액션
          </dt>
          <dd className="text-body font-medium text-ink">{insight.action}</dd>
        </div>
      </dl>
    </div>
  );
}

export function DashboardWorkspace() {
  const router = useRouter();
  const [data, setData] = useState<DashboardApiPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("inflow");
  const [aiInsights, setAiInsights] = useState<Record<TabKey, SegmentInsight[] | null>>({
    inflow: null,
    stage: null,
  });
  const [aiLoadingTab, setAiLoadingTab] = useState<TabKey | null>(null);
  const [aiErrorTab, setAiErrorTab] = useState<Record<TabKey, string | null>>({
    inflow: null,
    stage: null,
  });

  const loadResult = useCallback(async () => {
    const sessionId = window.localStorage.getItem(SESSION_ID_STORAGE_KEY);

    if (!sessionId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/result/${sessionId}`);
      const payload = (await response.json()) as DashboardApiPayload | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "분류 결과를 불러오지 못했습니다.");
      }

      setData(payload as DashboardApiPayload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "분류 결과를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  const dashboardRows = useMemo<DashboardRow[]>(
    () => (data?.results ?? []).map(toDashboardRow),
    [data?.results],
  );

  const inflowSegments = useMemo(() => buildInflowBreakdown(dashboardRows), [dashboardRows]);
  const stageSegments = useMemo(() => buildStageBreakdown(dashboardRows), [dashboardRows]);
  const activeSegments = activeTab === "inflow" ? inflowSegments : stageSegments;
  const headline = useMemo(() => buildHeadline(activeSegments), [activeSegments]);

  const counts = useMemo(() => {
    const rows = data?.results ?? [];
    const reviewCount = rows.filter((row) => row.needs_review && !row.review_completed).length;
    return { totalCount: rows.length, reviewCount };
  }, [data?.results]);

  // 새로고침해도 유지되도록 localStorage에 캐시된 인사이트를 복원
  useEffect(() => {
    const sessionId = window.localStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (!sessionId) return;

    setAiInsights((current) => {
      const next = { ...current };
      for (const tab of ["inflow", "stage"] as TabKey[]) {
        const cached = window.localStorage.getItem(insightCacheKey(sessionId, tab));
        if (cached) {
          try {
            next[tab] = JSON.parse(cached) as SegmentInsight[];
          } catch {
            // 캐시가 깨졌으면 무시
          }
        }
      }
      return next;
    });
  }, []);

  const fetchInsights = useCallback(async (tab: TabKey) => {
    const sessionId = window.localStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (!sessionId) return;

    setAiLoadingTab(tab);
    setAiErrorTab((current) => ({ ...current, [tab]: null }));

    try {
      const response = await fetch("/api/dashboard-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, tab }),
      });
      const payload = (await response.json()) as { insights?: SegmentInsight[]; error?: string };

      if (!response.ok || !payload.insights) {
        throw new Error(payload.error ?? "AI 인사이트를 생성하지 못했습니다.");
      }

      setAiInsights((current) => ({ ...current, [tab]: payload.insights! }));
      window.localStorage.setItem(insightCacheKey(sessionId, tab), JSON.stringify(payload.insights));
    } catch (error) {
      setAiErrorTab((current) => ({
        ...current,
        [tab]: error instanceof Error ? error.message : "AI 인사이트를 생성하지 못했습니다.",
      }));
    } finally {
      setAiLoadingTab(null);
    }
  }, []);

  if (isLoading) {
    return (
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-xl border border-hairline bg-white p-8 text-center">
          <p className="text-heading-sub text-ink">대시보드를 불러오고 있습니다</p>
          <p className="mt-2 text-body text-slate">저장된 분류 결과를 집계하는 중입니다.</p>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 rounded-xl border border-hairline bg-white p-8">
          <div>
            <p className="text-heading-sub text-ink">대시보드를 불러오지 못했습니다</p>
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

  if (!data || counts.totalCount === 0) {
    return (
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-xl border border-hairline bg-white p-8 text-center">
          <p className="text-heading-sub text-ink">집계할 분류 결과가 없습니다</p>
          <p className="mt-2 text-body text-slate">분류가 완료된 세션인지 확인해 주세요.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 w-fit text-slate"
            onClick={() => router.push("/result")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            결과로 돌아가기
          </Button>
          <p className="text-heading-page text-ink">
            📊 {data.session.cohort_name ? `${data.session.cohort_name} 취소 인사이트` : "취소 인사이트 대시보드"}
          </p>
          <p className="text-caption text-slate">
            총 취소 {counts.totalCount}명 · 검토필요 {counts.reviewCount}명
          </p>
        </header>

        <div className="flex gap-2 border-b border-hairline">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "min-h-11 px-4 py-2 text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
                activeTab === tab.key
                  ? "border-b-2 border-ink font-medium text-ink"
                  : "text-slate hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border-l-4 border-l-blue-400 bg-blue-50 px-5 py-4">
          <p className="text-body text-charcoal">💬 {headline}</p>
        </div>

        {activeSegments.length > 0 ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-heading-sub text-ink">AI 인사이트</p>
              {aiInsights[activeTab] ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate"
                  disabled={aiLoadingTab === activeTab}
                  onClick={() => void fetchInsights(activeTab)}
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  다시 생성
                </Button>
              ) : null}
            </div>

            {aiLoadingTab === activeTab ? (
              <div className="flex items-center gap-2 rounded-xl border border-hairline bg-surface px-5 py-6 text-body text-slate">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI가 그룹별 원인과 액션을 분석하고 있어요...
              </div>
            ) : aiInsights[activeTab] ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {aiInsights[activeTab]!.map((insight) => (
                  <AiInsightCard key={insight.segment} insight={insight} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-hairline bg-surface px-5 py-6">
                <p className="text-body text-slate">
                  그룹별 <span className="text-ink">추정 원인</span>과{" "}
                  <span className="text-ink">추천 액션</span>을 AI가 만들어 드려요. (몇 초 소요)
                </p>
                <Button type="button" onClick={() => void fetchInsights(activeTab)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 인사이트 받기
                </Button>
              </div>
            )}

            {aiErrorTab[activeTab] ? (
              <p className="text-caption text-red-600">{aiErrorTab[activeTab]}</p>
            ) : null}
          </section>
        ) : null}

        {activeSegments.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeSegments.map((segment) => (
              <SegmentCard key={segment.key} segment={segment} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-hairline bg-surface px-4 py-6 text-center text-body text-slate">
            이 기준으로 나눌 데이터가 없습니다.
          </p>
        )}
      </div>
    </main>
  );
}
