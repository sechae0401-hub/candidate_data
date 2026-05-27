import { findExactColumnName } from "@/upload/template-validation";
import type { WorkbookSnapshot } from "@/upload/types";

export const CLASSIFICATION_DRAFT_STORAGE_KEY = "classification_draft";
export const MAX_CLASSIFICATION_ROWS = 200;
export const CLASSIFICATION_LIMIT_ERROR_MESSAGE = "파일 크기(또는 행 수) 제한을 초과했습니다";

export interface ClassificationDraftRow {
  rowIndex: number;
  interviewContent: string;
  notes: string;
  resultValue: string;
  source: Record<string, string>;
}

export interface ClassificationDraft {
  sessionId: string;
  cohortName: string | null;
  totalRows: number;
  rows: ClassificationDraftRow[];
}

export function buildClassificationDraft({
  sessionId,
  cohortName,
  selectedResultValues,
  snapshot,
}: {
  sessionId: string;
  cohortName: string | null;
  selectedResultValues: string[];
  snapshot: WorkbookSnapshot;
}): ClassificationDraft {
  if (snapshot.totalRows > MAX_CLASSIFICATION_ROWS) {
    throw new Error(CLASSIFICATION_LIMIT_ERROR_MESSAGE);
  }

  const interviewColumn = findExactColumnName(snapshot.columns, "인터뷰내용");
  const notesColumn = findExactColumnName(snapshot.columns, "특이사항");
  const resultColumn = findExactColumnName(snapshot.columns, "최종결과");

  if (!interviewColumn || !notesColumn || !resultColumn) {
    throw new Error("분류에 필요한 필수 컬럼을 찾지 못했습니다");
  }

  const selectedValues = new Set(selectedResultValues);
  const rows = snapshot.rows.flatMap<ClassificationDraftRow>((row, index) => {
    const resultValue = row[resultColumn] ?? "";

    if (!selectedValues.has(resultValue)) {
      return [];
    }

    return [
      {
        rowIndex: index + 2,
        interviewContent: row[interviewColumn] ?? "",
        notes: row[notesColumn] ?? "",
        resultValue,
        source: row,
      },
    ];
  });

  return {
    sessionId,
    cohortName,
    totalRows: rows.length,
    rows,
  };
}
