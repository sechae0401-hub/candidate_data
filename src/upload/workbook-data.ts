import type { UploadRowRecord, WorkbookSnapshot } from "@/upload/types";

function sanitizeWorkbookCellValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return "";
}

function hasAnyValue(row: unknown[]) {
  return row.some((cell) => sanitizeWorkbookCellValue(cell) !== "");
}

function buildColumns(headerRow: unknown[]) {
  return headerRow
    .map((cell, index) => {
      const label = sanitizeWorkbookCellValue(cell);
      return label === "" ? `컬럼${index + 1}` : label;
    })
    .filter((label) => label !== "");
}

function buildRowRecord(columns: string[], row: unknown[]): UploadRowRecord {
  return columns.reduce<UploadRowRecord>((record, columnName, index) => {
    record[columnName] = sanitizeWorkbookCellValue(row[index]);
    return record;
  }, {});
}

export function createWorkbookSnapshotFromMatrix(matrix: unknown[][], firstSheetName: string): WorkbookSnapshot {
  const [headerRow = [], ...bodyRows] = matrix;
  const columns = buildColumns(headerRow);
  const normalizedRows = bodyRows
    .filter((row) => hasAnyValue(row))
    .map((row) => buildRowRecord(columns, row));

  return {
    firstSheetName,
    columns,
    rows: normalizedRows,
    totalRows: normalizedRows.length,
  };
}

