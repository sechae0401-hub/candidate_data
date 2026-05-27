import type { WorkbookSnapshot } from "@/upload/types";

import { findExactColumnName } from "@/upload/template-validation";

export interface ResultValueOption {
  value: string;
  count: number;
}

const FINAL_RESULT_COLUMN = "최종결과";

export function getFinalResultColumnName(snapshot: WorkbookSnapshot) {
  return findExactColumnName(snapshot.columns, FINAL_RESULT_COLUMN) ?? FINAL_RESULT_COLUMN;
}

export function getResultValueOptions(snapshot: WorkbookSnapshot): ResultValueOption[] {
  const resultColumnName = getFinalResultColumnName(snapshot);
  const counter = new Map<string, number>();

  snapshot.rows.forEach((row) => {
    const value = row[resultColumnName]?.trim();

    if (!value) {
      return;
    }

    counter.set(value, (counter.get(value) ?? 0) + 1);
  });

  return [...counter.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.value.localeCompare(right.value, "ko-KR");
    });
}

export function countRowsForSelectedResultValues(snapshot: WorkbookSnapshot, selectedValues: string[]) {
  if (selectedValues.length === 0) {
    return 0;
  }

  const selectedSet = new Set(selectedValues);
  const resultColumnName = getFinalResultColumnName(snapshot);

  return snapshot.rows.reduce((count, row) => {
    return selectedSet.has(row[resultColumnName]) ? count + 1 : count;
  }, 0);
}

