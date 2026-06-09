// "아쉬운 이탈(노란불)" 회고 분석
// ------------------------------------------------------------------
// 기수 마감 후 돌아보는 분석이다. 이미 취소한 사람들 중
// "잡을 가능성이 있었는데 놓친 사람"(노란불)이 몇 명인지 가려낸다.
// 우리가 실제로 잡으려 시도했는지는 데이터에 없으므로,
// 분류 결과(1차 원인 + 향후 행동)만으로 '가능성'을 판정한다.
//
// AI를 추가로 호출하지 않고, 아래 규칙표로만 판정한다(투명·수정 용이).

export type MissedOpportunityVerdict = "노란불" | "자연이탈" | "검토필요";

// 향후 행동이 이 값이면 → 돌아올 신호 (노란불)
const WIN_BACK_ACTIONS = new Set<string>(["재지원 의향", "타 과정 결과 대기"]);

// 향후 향방이 이 값이면 → 사실상 떠남 (자연이탈)
// 연락 두절: 이미 여러 번 연락했는데 무응답이므로 더 잡을 수 없는 것으로 본다.
const LOST_ACTIONS = new Set<string>([
  "타 과정 합격 확정",
  "취업·진학 전념",
  "완전 이탈",
  "연락 두절",
]);

// 향후 행동이 '미확인'일 때, 1차 원인이 우리가 손쓸 수 있는 것이면 노란불로 본다.
// (취업·합격 / 건강 문제 / KDT 수강이력은 우리가 어찌할 수 없어 제외)
const ADDRESSABLE_CAUSES = new Set<string>([
  "일정 충돌",
  "타 과정 신청",
  "타 과정 신청 (추정)",
  "내일배움카드 이슈",
  "비용 부담",
  "커리큘럼",
]);

// 구조적으로 다시 받을 수 없는 원인 → 향방과 무관하게 자연이탈
// (오프라인 과정 특성상 직장·학교 병행 불가 / KDT 중복 수강 불가 등 — 다음 기수에도 동일하게 불가)
const HARD_LOST_CAUSES = new Set<string>([
  "직장·학업 병행 불가",
  "KDT 수강이력",
]);

export interface MissedOpportunityRow {
  primaryCause: string | null;
  secondaryAction: string | null;
  needsReview?: boolean;
  reviewCompleted?: boolean;
}

// 한 사람을 노란불 / 자연이탈 / 검토필요 중 하나로 판정한다.
export function judgeMissedOpportunity(row: MissedOpportunityRow): MissedOpportunityVerdict {
  // 아직 사람이 확인하지 않은 행은 판정을 보류한다.
  if (row.needsReview && !row.reviewCompleted) {
    return "검토필요";
  }

  const cause = row.primaryCause?.trim() ?? "";
  // 구조적으로 다시 받을 수 없는 원인이면, 향방(재지원 의향 등)과 무관하게 자연이탈이다.
  if (HARD_LOST_CAUSES.has(cause)) {
    return "자연이탈";
  }

  const action = row.secondaryAction?.trim() ?? "";
  if (WIN_BACK_ACTIONS.has(action)) {
    return "노란불";
  }
  if (LOST_ACTIONS.has(action)) {
    return "자연이탈";
  }

  // 향후 계획 미확인 또는 알 수 없는 값 → 1차 원인으로 보정한다.
  return ADDRESSABLE_CAUSES.has(cause) ? "노란불" : "자연이탈";
}

export interface MissedOpportunitySummary<T extends MissedOpportunityRow> {
  missedCount: number; // 노란불 = 잡을 가능성이 있었던 사람
  naturalCount: number; // 자연이탈 = 어차피 못 잡는 사람
  reviewPendingCount: number; // 검토필요(판정 보류)
  total: number;
  missedRows: T[]; // 노란불로 판정된 행들 (명단·사유 표시용)
}

// 전체 행을 모아 노란불 수 + 명단을 만든다.
export function buildMissedOpportunitySummary<T extends MissedOpportunityRow>(
  rows: T[],
): MissedOpportunitySummary<T> {
  let missedCount = 0;
  let naturalCount = 0;
  let reviewPendingCount = 0;
  const missedRows: T[] = [];

  for (const row of rows) {
    const verdict = judgeMissedOpportunity(row);
    if (verdict === "노란불") {
      missedCount += 1;
      missedRows.push(row);
    } else if (verdict === "자연이탈") {
      naturalCount += 1;
    } else {
      reviewPendingCount += 1;
    }
  }

  return {
    missedCount,
    naturalCount,
    reviewPendingCount,
    total: rows.length,
    missedRows,
  };
}
