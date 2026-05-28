export const CLASSIFICATION_DRAFT_STORAGE_KEY = "classification_draft";

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
