const ACCEPTED_WORKBOOK_EXTENSIONS = [".xlsx", ".xls"] as const;

export const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_ROWS = 200;
export const WORKBOOK_FILE_ERROR_MESSAGE = "xlsx 또는 xls 파일만 업로드할 수 있습니다";
export const WORKBOOK_FILE_SIZE_ERROR_MESSAGE = "업로드 파일은 10MB 이하만 허용됩니다";
export const WORKBOOK_ROW_LIMIT_ERROR_MESSAGE = `한 번에 최대 ${MAX_UPLOAD_ROWS}건까지 분석 가능합니다. 기수를 나눠 업로드해 주세요.`;

function hasAcceptedWorkbookExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();

  return ACCEPTED_WORKBOOK_EXTENSIONS.some((extension) => normalized.endsWith(extension));
}

export function getWorkbookFileError(file: Pick<File, "name" | "size">) {
  if (!hasAcceptedWorkbookExtension(file.name)) {
    return WORKBOOK_FILE_ERROR_MESSAGE;
  }

  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    return WORKBOOK_FILE_SIZE_ERROR_MESSAGE;
  }

  return null;
}

export function formatWorkbookSummary(fileName: string, totalRows: number) {
  return `${fileName} | 총 ${totalRows}행`;
}

