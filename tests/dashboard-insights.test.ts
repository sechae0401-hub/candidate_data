import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHeadline,
  buildInflowBreakdown,
  buildStageBreakdown,
  hasInflowData,
  mapFinalResultToStage,
  readSourceField,
  type DashboardRow,
} from "../src/result/dashboard-insights";

function row(primaryCause: string, source: Record<string, unknown>): DashboardRow {
  return { primaryCause, source };
}

test("readSourceField는 컬럼명 공백 차이를 무시하고 값을 찾는다", () => {
  const source = { "유입 경로": " SNS 광고 ", 최종결과: "신청취소(인터뷰 전)" };
  assert.equal(readSourceField(source, "유입경로"), "SNS 광고");
  assert.equal(readSourceField(source, "최종결과"), "신청취소(인터뷰 전)");
  assert.equal(readSourceField(source, "없는컬럼"), "");
  assert.equal(readSourceField(null, "유입경로"), "");
});

test("mapFinalResultToStage는 최종결과 값을 단계로 매핑한다", () => {
  assert.equal(mapFinalResultToStage("신청취소(인터뷰 전)"), "interview-before");
  assert.equal(mapFinalResultToStage("신청취소(인터뷰노쇼)"), "interview-before");
  assert.equal(mapFinalResultToStage("신청취소(본인요청)"), "in-progress");
  assert.equal(mapFinalResultToStage("신청취소(연락X)"), "in-progress");
  assert.equal(mapFinalResultToStage("합격취소(신청자 요청)"), "after-pass");
  assert.equal(mapFinalResultToStage("합격취소(연락두절)"), "after-pass");
  assert.equal(mapFinalResultToStage("HRD등록"), "other");
  assert.equal(mapFinalResultToStage(""), "other");
});

test("buildInflowBreakdown은 유입경로별로 묶고 사유 비율을 계산한다", () => {
  const rows: DashboardRow[] = [
    row("비용 부담", { 유입경로: "SNS 광고" }),
    row("비용 부담", { 유입경로: "SNS 광고" }),
    row("일정 충돌", { 유입경로: "SNS 광고" }),
    row("일정 충돌", { 유입경로: "검색" }),
  ];

  const result = buildInflowBreakdown(rows);
  const sns = result.find((s) => s.label === "SNS 광고");

  assert.ok(sns);
  assert.equal(sns.total, 3);
  assert.deepEqual(sns.topCauses[0], { cause: "비용 부담", count: 2, percentage: 67 });
  assert.deepEqual(sns.topCauses[1], { cause: "일정 충돌", count: 1, percentage: 33 });
});

test("buildInflowBreakdown은 상위 N개만 남기고 나머지를 기타로 묶는다", () => {
  const rows: DashboardRow[] = [
    ...Array.from({ length: 5 }, () => row("비용 부담", { 유입경로: "SNS 광고" })),
    ...Array.from({ length: 4 }, () => row("일정 충돌", { 유입경로: "검색" })),
    ...Array.from({ length: 3 }, () => row("개인 사정", { 유입경로: "지인추천" })),
    row("건강 문제", { 유입경로: "고용24" }),
    row("건강 문제", { 유입경로: "인스타그램" }),
  ];

  const result = buildInflowBreakdown(rows, { maxSegments: 2 });

  assert.equal(result.length, 3); // SNS 광고, 검색, 기타
  assert.deepEqual(
    result.map((s) => s.label),
    ["SNS 광고", "검색", "기타"],
  );
  const other = result.find((s) => s.label === "기타");
  assert.ok(other);
  assert.equal(other.total, 5); // 지인추천 3 + 고용24 1 + 인스타그램 1
});

test("buildInflowBreakdown은 유입경로가 비면 미입력 세그먼트로 묶는다", () => {
  const rows: DashboardRow[] = [
    row("비용 부담", {}),
    row("일정 충돌", { 유입경로: "" }),
  ];

  const result = buildInflowBreakdown(rows);
  assert.equal(result.length, 1);
  assert.equal(result[0].label, "미입력");
  assert.equal(result[0].total, 2);
});

test("hasInflowData는 유입경로 값이 하나도 없으면 false를 반환한다", () => {
  const noInflow: DashboardRow[] = [
    row("비용 부담", { 최종결과: "신청취소(본인요청)", 인터뷰내용: "x" }),
    row("일정 충돌", { 최종결과: "신청취소(연락X)" }),
  ];
  assert.equal(hasInflowData(noInflow), false);

  const withInflow: DashboardRow[] = [
    row("비용 부담", { 유입경로: "SNS 광고" }),
    row("일정 충돌", {}),
  ];
  assert.equal(hasInflowData(withInflow), true);
});

test("buildHeadline은 상위 두 세그먼트의 대표 사유를 비교 문장으로 만든다", () => {
  const rows: DashboardRow[] = [
    ...Array.from({ length: 3 }, () => row("비용 부담", { 유입경로: "SNS 광고" })),
    ...Array.from({ length: 2 }, () => row("일정 충돌", { 유입경로: "검색" })),
  ];

  const headline = buildHeadline(buildInflowBreakdown(rows));
  assert.equal(headline, "SNS 광고는 '비용 부담', 검색는 '일정 충돌'이(가) 가장 큰 취소 이유예요.");
});

test("buildHeadline은 데이터가 부족하면 안내 문장을 반환한다", () => {
  const rows: DashboardRow[] = [row("정보 부족", { 유입경로: "" })];
  const headline = buildHeadline(buildInflowBreakdown(rows));
  assert.equal(headline, "세그먼트별 차이를 보여줄 데이터가 아직 부족해요.");
});

test("buildStageBreakdown은 단계 고정 순서로 정렬하고 빈 단계는 제외한다", () => {
  const rows: DashboardRow[] = [
    row("개인 사정", { 최종결과: "합격취소(신청자 요청)" }),
    row("일정 충돌", { 최종결과: "신청취소(인터뷰 전)" }),
    row("비용 부담", { 최종결과: "신청취소(본인요청)" }),
    row("개인 사정", { 최종결과: "합격취소(연락두절)" }),
  ];

  const result = buildStageBreakdown(rows);

  // 인터뷰 전 → 중간 → 합격 후 순서 (기타 단계는 데이터 없어 제외)
  assert.deepEqual(
    result.map((s) => s.label),
    ["인터뷰 전", "중간", "합격 후 취소"],
  );
  const afterPass = result.find((s) => s.label === "합격 후 취소");
  assert.ok(afterPass);
  assert.equal(afterPass.total, 2);
  assert.equal(afterPass.topCauses[0].cause, "개인 사정");
  assert.equal(afterPass.topCauses[0].percentage, 100);
});
