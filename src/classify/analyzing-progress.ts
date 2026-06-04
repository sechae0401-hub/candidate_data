export const CLASSIFICATION_BATCH_SIZE = 3;
export const PARALLEL_BATCH_COUNT = 3;

export const INSIGHT_LOADING_MESSAGE =
  "취소 이유들을 한데 모아 흐름을 읽는 중입니다. 잠깐만요... 🧩";

export const WITTY_LOADING_MESSAGES = [
  "플데 AI 탐정 출동! 취소 사유를 추적 중입니다 🕵️ 진실은 반드시 밝혀집니다",
  "지원자의 마음속을 낱낱이 파헤치는 중... 모두 밝혀질 것입니다 🔍",
  "왜 떠났을까요... 플데 AI가 눈물을 닦으며 이유를 찾는 중입니다 💔",
  "지원자의 마음 변심 원인을 추적 중입니다. 연락두절의 이유를 찾겠습니다",
  "야근은 없다! 3건씩 처리 중이니 잠깐만요 🖥️ - 플데 마케터 어록",
  "분석봇이 세 명씩 묶어 심문하고 있습니다. 잠시만 기다려 주세요",
] as const;

export type AnalyzingStage = "classifying" | "insight" | "complete" | "failed";

export interface BatchRange {
  startIndex: number;
  endIndex: number;
}

export function buildBatchRanges(totalRows: number, batchSize = CLASSIFICATION_BATCH_SIZE) {
  const safeTotalRows = Math.max(0, Math.floor(totalRows));
  const safeBatchSize = Math.max(1, Math.floor(batchSize));
  const ranges: BatchRange[] = [];

  for (let startIndex = 0; startIndex < safeTotalRows; startIndex += safeBatchSize) {
    ranges.push({
      startIndex,
      endIndex: Math.min(startIndex + safeBatchSize, safeTotalRows),
    });
  }

  return ranges;
}

export function calculateProgressPercent(completedRows: number, totalRows: number) {
  if (totalRows <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((completedRows / totalRows) * 100)));
}

export function getAnalyzingStageLabel(stage: AnalyzingStage) {
  if (stage === "insight") {
    return "인사이트 요약 생성 중";
  }

  if (stage === "complete") {
    return "분류 완료";
  }

  if (stage === "failed") {
    return "분류 실패";
  }

  return "취소 사유 분류 중";
}

export function buildReviewNotice(reviewRowCount: number) {
  return `${reviewRowCount}건 검토 필요로 처리됨, 계속 진행 중`;
}

export function hasFullClassificationFailure({
  totalRows,
  completedRows,
  failedRows,
}: {
  totalRows: number;
  completedRows: number;
  failedRows: number;
}) {
  return totalRows > 0 && completedRows === 0 && failedRows >= totalRows;
}
