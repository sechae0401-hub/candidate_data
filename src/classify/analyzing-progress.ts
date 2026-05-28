export const CLASSIFICATION_BATCH_SIZE = 3;

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
