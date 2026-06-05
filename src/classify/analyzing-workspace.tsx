"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  buildBatchRanges,
  buildReviewNotice,
  calculateProgressPercent,
  getAnalyzingStageLabel,
  hasFullClassificationFailure,
  INSIGHT_LOADING_MESSAGE,
  PARALLEL_BATCH_COUNT,
  WITTY_LOADING_MESSAGES,
  type AnalyzingStage,
  type BatchRange,
} from "@/classify/analyzing-progress";
import {
  buildCompletionMessage,
  COMPLETION_FADE_DURATION_MS,
  COMPLETION_MESSAGE_DURATION_MS,
} from "@/classify/completion-feedback";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { CLASSIFICATION_DRAFT_STORAGE_KEY, type ClassificationDraft } from "@/shared/types/classification-draft";
import { SESSION_ID_STORAGE_KEY } from "@/shared/session/session-guard";

interface BatchClassificationResponse {
  processedCount?: number;
  reviewCount?: number;
  error?: string;
}

function readClassificationDraft() {
  const rawDraft = window.localStorage.getItem(CLASSIFICATION_DRAFT_STORAGE_KEY);

  if (!rawDraft) {
    return null;
  }

  try {
    return JSON.parse(rawDraft) as ClassificationDraft;
  } catch {
    return null;
  }
}

export function AnalyzingWorkspace() {
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = useState<ClassificationDraft | null>(null);
  const [stage, setStage] = useState<AnalyzingStage>("classifying");
  const [completedRows, setCompletedRows] = useState(0);
  const [failedRows, setFailedRows] = useState(0);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);
  const [isWaitingOnGpt, setIsWaitingOnGpt] = useState(false);
  const [wittyMessageIndex, setWittyMessageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRedirectingToResult, setIsRedirectingToResult] = useState(false);
  const hasStartedRef = useRef(false);
  const isCancelledRef = useRef(false);

  const totalRows = draft?.rows.length ?? 0;
  const progressValue = useMemo(() => calculateProgressPercent(completedRows, totalRows), [completedRows, totalRows]);

  const runClassification = useCallback(
    async (currentDraft: ClassificationDraft) => {
      isCancelledRef.current = false;
      setStage("classifying");
      setCompletedRows(0);
      setFailedRows(0);
      setReviewNotice(null);
      setErrorMessage(null);

      let nextCompletedRows = 0;
      let nextFailedRows = 0;
      let totalReviewCount = 0;

      // 동시성 풀: 항상 PARALLEL_BATCH_COUNT개를 처리 중으로 유지하고,
      // 한 배치가 끝나면 대기 없이 다음 배치를 바로 투입한다 (묶음 단위 대기벽 제거).
      const allRanges = buildBatchRanges(currentDraft.rows.length);
      let cursor = 0;

      const processBatch = async (range: BatchRange) => {
        const batchRows = currentDraft.rows.slice(range.startIndex, range.endIndex);
        const batchLength = range.endIndex - range.startIndex;

        try {
          const response = await fetch("/api/classify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ sessionId: currentDraft.sessionId, rows: batchRows }),
          });
          const payload = (await response.json()) as BatchClassificationResponse;

          if (!response.ok) {
            throw new Error(payload.error ?? "분류 배치를 처리하지 못했습니다.");
          }

          nextCompletedRows += payload.processedCount ?? batchLength;
          nextFailedRows += payload.reviewCount ?? 0;
          totalReviewCount += payload.reviewCount ?? 0;
        } catch (error) {
          console.error("Classification batch failed:", error);
          nextFailedRows += batchLength;
        }

        setCompletedRows(nextCompletedRows);
        setFailedRows(nextFailedRows);
        if (totalReviewCount > 0) {
          setReviewNotice(buildReviewNotice(totalReviewCount));
        }
      };

      const worker = async () => {
        while (!isCancelledRef.current) {
          const index = cursor;
          cursor += 1;
          if (index >= allRanges.length) {
            return;
          }
          await processBatch(allRanges[index]);
        }
      };

      const waitingTimer = window.setTimeout(() => {
        setIsWaitingOnGpt(true);
      }, 7000);

      const workerCount = Math.min(PARALLEL_BATCH_COUNT, allRanges.length);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));

      window.clearTimeout(waitingTimer);
      setIsWaitingOnGpt(false);

      if (
        hasFullClassificationFailure({
          totalRows: currentDraft.rows.length,
          completedRows: nextCompletedRows,
          failedRows: nextFailedRows,
        })
      ) {
        setStage("failed");
        setErrorMessage("분류를 완료하지 못했습니다. 다시 시도해 주세요");
        return;
      }

      setStage("insight");

      try {
        const response = await fetch("/api/insight", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ sessionId: currentDraft.sessionId }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "인사이트 요약을 생성하지 못했습니다.");
        }

        setCompletedRows(currentDraft.rows.length);
        setStage("complete");
        window.setTimeout(() => {
          setIsRedirectingToResult(true);
          window.setTimeout(() => {
            router.push("/result");
          }, COMPLETION_FADE_DURATION_MS);
        }, COMPLETION_MESSAGE_DURATION_MS);
      } catch (error) {
        console.error("Insight request failed:", error);
        setStage("failed");
        const message =
          error instanceof Error
            ? error.message
            : "분류를 완료하지 못했습니다. 다시 시도해 주세요";
        setErrorMessage(message);
      }
    },
    [router],
  );

  async function handleCancelClassification() {
    if (!draft) {
      return;
    }

    isCancelledRef.current = true;
    setIsCancelling(true);

    try {
      const response = await fetch(`/api/sessions/${draft.sessionId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "분류 취소를 완료하지 못했습니다.");
      }

      window.localStorage.removeItem(SESSION_ID_STORAGE_KEY);
      window.localStorage.removeItem(CLASSIFICATION_DRAFT_STORAGE_KEY);
      toast({
        title: "분류를 취소했습니다",
        description: "업로드 화면으로 돌아갑니다.",
      });
      router.push("/upload");
    } catch (error) {
      console.error("Cancel classification failed:", error);
      isCancelledRef.current = false;
      toast({
        title: "분류를 취소하지 못했습니다",
        description:
          error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
        variant: "error",
      });
    } finally {
      setIsCancelling(false);
    }
  }

  useEffect(() => {
    const nextDraft = readClassificationDraft();

    if (!nextDraft || nextDraft.rows.length === 0) {
      setErrorMessage("분류할 행 정보를 찾지 못했습니다. 업로드 화면에서 다시 시작해 주세요");
      setStage("failed");
      return;
    }

    setDraft(nextDraft);
  }, []);

  useEffect(() => {
    if (!draft || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    void runClassification(draft);
  }, [draft, runClassification]);

  useEffect(() => {
    if (stage !== "classifying" && stage !== "insight") {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "분류가 진행 중입니다. 지금 이탈하면 분류가 중단됩니다. 계속 진행하시겠습니까?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== "classifying") {
      return;
    }

    const interval = window.setInterval(() => {
      setWittyMessageIndex((prev) => (prev + 1) % WITTY_LOADING_MESSAGES.length);
    }, 3500);

    return () => {
      window.clearInterval(interval);
    };
  }, [stage]);

  return (
    <main className="px-6 py-12">
      <div
        className={[
          "mx-auto flex max-w-2xl flex-col gap-4 rounded-xl border border-hairline bg-white p-8 shadow-sm transition-opacity duration-150",
          isRedirectingToResult ? "opacity-0" : "opacity-100",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <Badge>{getAnalyzingStageLabel(stage)}</Badge>
          {draft?.cohortName ? <span className="text-caption text-slate">{draft.cohortName}</span> : null}
        </div>

        <div className="space-y-3">
          <h1 className="text-heading-page text-ink">
            {stage === "classifying"
              ? WITTY_LOADING_MESSAGES[wittyMessageIndex]
              : stage === "insight"
              ? INSIGHT_LOADING_MESSAGE
              : stage === "complete"
              ? `${draft?.cohortName ? `${draft.cohortName} ` : ""}취소 사유 ${totalRows}건, 모두 분류됐습니다.`
              : getAnalyzingStageLabel(stage)}
          </h1>
          <p className="text-body text-slate">
            {completedRows}건 완료 / {totalRows}건 전체
          </p>
          <Progress value={progressValue} />
        </div>

        {stage === "complete" ? (
          <div className="rounded-xl border border-status-done bg-status-done-soft p-4 text-button text-ink">
            {buildCompletionMessage(completedRows)}
          </div>
        ) : null}

        {isWaitingOnGpt ? (
          <div className="rounded-xl border border-hairline bg-surface p-4 text-caption text-slate">
            GPT 서버 응답 대기 중입니다. 잠시만 기다려 주세요.
          </div>
        ) : null}

        {reviewNotice ? (
          <div className="rounded-xl border border-status-review bg-status-review-soft p-4 text-caption text-charcoal">
            {reviewNotice}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="space-y-4 rounded-xl border border-status-error bg-status-error-soft p-4">
            <p className="text-button text-ink">{errorMessage}</p>
            <div className="flex flex-wrap gap-3">
              {draft ? (
                <Button
                  type="button"
                  onClick={() => {
                    void runClassification(draft);
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  다시 시도
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  router.push("/upload");
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                업로드 화면으로 돌아가기
              </Button>
            </div>
          </div>
        ) : null}

        {stage === "classifying" || stage === "insight" ? (
          <div className="pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isCancelling} type="button" variant="danger">
                  {isCancelling ? "취소 처리 중..." : "분류 취소"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>분류를 취소하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    지금까지의 결과는 저장되지 않습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>계속 진행</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      void handleCancelClassification();
                    }}
                  >
                    취소 확인
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </div>
    </main>
  );
}
