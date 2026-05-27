export interface UploadRowRecord {
  [columnName: string]: string;
}

export interface WorkbookSnapshot {
  firstSheetName: string;
  columns: string[];
  rows: UploadRowRecord[];
  totalRows: number;
}

