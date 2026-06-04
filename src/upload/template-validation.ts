import type { WorkbookSnapshot } from "@/upload/types";

const REQUIRED_TEMPLATE_COLUMNS = ["인터뷰내용", "특이사항", "최종결과"] as const;
const VALIDATION_SUCCESS_MESSAGE = "양식 확인 완료. AI 컬럼 분석을 시작합니다";

export interface TemplateValidationSuccess {
  status: "valid";
  message: string;
}

export interface TemplateValidationMissingColumn {
  status: "missing-column";
  message: string;
  missingColumn: string;
}

export interface TemplateValidationSimilarColumn {
  status: "similar-column";
  message: string;
  missingColumn: string;
  similarColumn: string;
}

export type TemplateValidationResult =
  | TemplateValidationSuccess
  | TemplateValidationMissingColumn
  | TemplateValidationSimilarColumn;

function normalizeColumnName(columnName: string) {
  return columnName.replace(/\s+/g, "").trim().toLowerCase();
}

export function findExactColumnName(columns: string[], targetColumnName: string) {
  const normalizedTarget = normalizeColumnName(targetColumnName);

  return columns.find((columnName) => normalizeColumnName(columnName) === normalizedTarget) ?? null;
}

function buildBigrams(input: string) {
  if (input.length < 2) {
    return [input];
  }

  const bigrams: string[] = [];

  for (let index = 0; index < input.length - 1; index += 1) {
    bigrams.push(input.slice(index, index + 2));
  }

  return bigrams;
}

function calculateDiceCoefficient(left: string, right: string) {
  const leftBigrams = buildBigrams(left);
  const rightBigrams = buildBigrams(right);
  const rightPool = [...rightBigrams];
  let matches = 0;

  leftBigrams.forEach((bigram) => {
    const matchIndex = rightPool.indexOf(bigram);

    if (matchIndex >= 0) {
      matches += 1;
      rightPool.splice(matchIndex, 1);
    }
  });

  return (2 * matches) / (leftBigrams.length + rightBigrams.length);
}

function calculateSharedSuffixRatio(left: string, right: string) {
  let matches = 0;
  const limit = Math.min(left.length, right.length);

  while (matches < limit && left.at(-(matches + 1)) === right.at(-(matches + 1))) {
    matches += 1;
  }

  return matches / Math.max(left.length, right.length);
}

function scoreColumnSimilarity(requiredColumn: string, candidateColumn: string) {
  const normalizedRequired = normalizeColumnName(requiredColumn);
  const normalizedCandidate = normalizeColumnName(candidateColumn);

  if (normalizedRequired === normalizedCandidate) {
    return 1;
  }

  const diceScore = calculateDiceCoefficient(normalizedRequired, normalizedCandidate);
  const suffixScore = calculateSharedSuffixRatio(normalizedRequired, normalizedCandidate);
  const inclusionBoost =
    normalizedRequired.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedRequired) ? 0.15 : 0;

  return Math.min(1, diceScore + suffixScore * 0.4 + inclusionBoost);
}

export function findSimilarColumnName(requiredColumn: string, availableColumns: string[]) {
  const rankedColumns = availableColumns
    .map((candidateColumn) => ({
      candidateColumn,
      score: scoreColumnSimilarity(requiredColumn, candidateColumn),
    }))
    .sort((left, right) => right.score - left.score);

  const bestMatch = rankedColumns[0];

  if (!bestMatch || bestMatch.score < 0.4) {
    return null;
  }

  return bestMatch.candidateColumn;
}

export function validateTemplateColumns(columns: WorkbookSnapshot["columns"]): TemplateValidationResult {
  for (const requiredColumn of REQUIRED_TEMPLATE_COLUMNS) {
    const hasExactMatch = columns.some(
      (columnName) => normalizeColumnName(columnName) === normalizeColumnName(requiredColumn),
    );

    if (hasExactMatch) {
      continue;
    }

    const similarColumn = findSimilarColumnName(requiredColumn, columns);

    if (similarColumn) {
      return {
        status: "similar-column",
        missingColumn: requiredColumn,
        similarColumn,
        message: `'${requiredColumn}' 컬럼이 없습니다. '${similarColumn}' 컬럼이 가장 유사합니다. 컬럼명을 '${requiredColumn}'으로 수정한 뒤 다시 업로드해 주세요`,
      };
    }

    return {
      status: "missing-column",
      missingColumn: requiredColumn,
      message: `'${requiredColumn}' 컬럼이 없습니다. 파일에 '인터뷰내용', '특이사항', '최종결과' 컬럼이 있어야 합니다`,
    };
  }

  return {
    status: "valid",
    message: VALIDATION_SUCCESS_MESSAGE,
  };
}
