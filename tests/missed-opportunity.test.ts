import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildMissedOpportunitySummary,
  judgeMissedOpportunity,
} from "../src/result/missed-opportunity";

test("돌아올 신호(향후 행동)는 노란불로 판정한다", () => {
  assert.equal(
    judgeMissedOpportunity({ primaryCause: "일정 충돌", secondaryAction: "재지원 의향" }),
    "노란불",
  );
  assert.equal(
    judgeMissedOpportunity({ primaryCause: "타 과정 신청", secondaryAction: "타 과정 결과 대기" }),
    "노란불",
  );
});

test("떠난 신호(향후 행동)는 자연이탈로 판정한다", () => {
  assert.equal(
    judgeMissedOpportunity({ primaryCause: "타 과정 신청", secondaryAction: "타 과정 합격 확정" }),
    "자연이탈",
  );
  assert.equal(
    judgeMissedOpportunity({ primaryCause: "취업·합격", secondaryAction: "취업·진학 전념" }),
    "자연이탈",
  );
  assert.equal(
    judgeMissedOpportunity({ primaryCause: "개인 사정", secondaryAction: "완전 이탈" }),
    "자연이탈",
  );
});

test("연락 두절(미회신)은 원인이 손쓸 수 있는 것이어도 자연이탈로 본다", () => {
  // 일정 충돌은 손쓸 수 있는 원인이지만, 연락이 두절됐으면 잡을 수 없으므로 자연이탈
  assert.equal(
    judgeMissedOpportunity({ primaryCause: "일정 충돌", secondaryAction: "연락 두절" }),
    "자연이탈",
  );
});

test("구조적으로 못 받는 원인은 향방과 무관하게 자연이탈로 본다", () => {
  // 직장·학업 병행 불가: 오프라인 과정을 구조적으로 못 다님 → 다음 기수에도 동일하게 불가
  assert.equal(
    judgeMissedOpportunity({ primaryCause: "직장·학업 병행 불가", secondaryAction: "향후 계획 미확인" }),
    "자연이탈",
  );
  // 재지원 의향이 보여도 구조적으로 불가하면 자연이탈
  assert.equal(
    judgeMissedOpportunity({ primaryCause: "직장·학업 병행 불가", secondaryAction: "재지원 의향" }),
    "자연이탈",
  );
  // KDT 수강이력(중복 수강 불가)도 동일
  assert.equal(
    judgeMissedOpportunity({ primaryCause: "KDT 수강이력", secondaryAction: "재지원 의향" }),
    "자연이탈",
  );
});

test("향후 계획 미확인은 1차 원인으로 보정한다", () => {
  // 우리가 손쓸 수 있는 원인(커리큘럼) → 노란불
  assert.equal(
    judgeMissedOpportunity({ primaryCause: "커리큘럼", secondaryAction: "향후 계획 미확인" }),
    "노란불",
  );
  // 우리가 어찌할 수 없는 원인(건강 문제) → 자연이탈
  assert.equal(
    judgeMissedOpportunity({ primaryCause: "건강 문제", secondaryAction: "향후 계획 미확인" }),
    "자연이탈",
  );
  // KDT 수강이력(중복 불가)도 자연이탈
  assert.equal(
    judgeMissedOpportunity({ primaryCause: "KDT 수강이력", secondaryAction: "향후 계획 미확인" }),
    "자연이탈",
  );
});

test("아직 사람이 확인하지 않은 행은 판정을 보류한다", () => {
  assert.equal(
    judgeMissedOpportunity({
      primaryCause: "정보 부족",
      secondaryAction: "검토 필요",
      needsReview: true,
    }),
    "검토필요",
  );
  // 사람이 검토를 끝냈으면 정상 판정한다
  assert.equal(
    judgeMissedOpportunity({
      primaryCause: "커리큘럼",
      secondaryAction: "재지원 의향",
      needsReview: true,
      reviewCompleted: true,
    }),
    "노란불",
  );
});

test("buildMissedOpportunitySummary는 노란불 수와 명단을 만든다", () => {
  const rows = [
    { primaryCause: "일정 충돌", secondaryAction: "재지원 의향" }, // 노란불
    { primaryCause: "커리큘럼", secondaryAction: "향후 계획 미확인" }, // 노란불
    { primaryCause: "취업·합격", secondaryAction: "취업·진학 전념" }, // 자연이탈
    { primaryCause: "정보 부족", secondaryAction: "검토 필요", needsReview: true }, // 검토필요
  ];

  const summary = buildMissedOpportunitySummary(rows);

  assert.equal(summary.missedCount, 2);
  assert.equal(summary.naturalCount, 1);
  assert.equal(summary.reviewPendingCount, 1);
  assert.equal(summary.total, 4);
  assert.equal(summary.missedRows.length, 2);
  assert.equal(summary.missedRows[0]?.primaryCause, "일정 충돌");
});
