import type { WorkbookSnapshot } from "@/upload/types";
import { createWorkbookSnapshotFromMatrix } from "@/upload/workbook-data";

export async function parseWorkbookFile(file: File): Promise<WorkbookSnapshot> {
  const XLSX = await import("xlsx");
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("업로드한 파일에서 시트를 찾을 수 없습니다");
  }

  const worksheet = workbook.Sheets[firstSheetName];

  if (!worksheet) {
    throw new Error("업로드한 파일의 시트 데이터를 읽을 수 없습니다");
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });

  return createWorkbookSnapshotFromMatrix(matrix, firstSheetName);
}

