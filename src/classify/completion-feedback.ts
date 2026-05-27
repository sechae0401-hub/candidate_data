export const COMPLETION_MESSAGE_DURATION_MS = 1000;
export const COMPLETION_FADE_DURATION_MS = 150;

export function buildCompletionMessage(completedRows: number) {
  return `${completedRows}건 분류 완료!`;
}
