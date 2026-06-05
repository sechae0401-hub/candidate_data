// 취소 인사이트 대시보드(S-004) 집계 로직 — 순수 함수 모듈.
// 결과 행의 source_snapshot(원본 엑셀 행) + primary_cause만으로 세그먼트별 사유 분포를 계산한다.
// 설계 메모: docs/design-대시보드-S004-v1.md

export interface DashboardRow {
  primaryCause: string | null;
  // classification_results.source_snapshot (원본 엑셀 행 전체)
  source: Record<string, unknown> | null;
}

export interface CauseShare {
  cause: string;
  count: number;
  percentage: number; // 0~100, 세그먼트 내 비율(반올림)
}

export interface SegmentBreakdown {
  key: string; // 세그먼트 식별자
  label: string; // 화면 표시용 라벨
  total: number; // 세그먼트 인원 수
  topCauses: CauseShare[]; // 상위 사유
}

export const INFLOW_COLUMN = "유입경로";
export const FINAL_RESULT_COLUMN = "최종결과";

const DEFAULT_TOP_CAUSES = 3;
const DEFAULT_MAX_SEGMENTS = 5;
const OTHER_SEGMENT_LABEL = "기타";
const UNKNOWN_SEGMENT_LABEL = "미입력";

// ── source_snapshot 값 조회 (컬럼명 공백 차이를 허용) ──
function normalizeColumnName(name: string) {
  return name.replace(/\s+/g, "").trim().toLowerCase();
}

export function readSourceField(
  source: Record<string, unknown> | null,
  columnName: string,
): string {
  if (!source) return "";

  const target = normalizeColumnName(columnName);
  for (const [key, value] of Object.entries(source)) {
    if (normalizeColumnName(key) === target) {
      return value == null ? "" : String(value).trim();
    }
  }

  return "";
}

// 업로드한 파일에 유입경로 값이 하나라도 있는지 (없으면 유입경로별 분석 불가)
export function hasInflowData(rows: DashboardRow[]): boolean {
  return rows.some((row) => readSourceField(row.source, INFLOW_COLUMN) !== "");
}

// ── 이탈 단계 매핑 (최종결과 → 단계) ──
export type StageKey = "interview-before" | "in-progress" | "after-pass" | "other";

export interface StageDefinition {
  key: StageKey;
  label: string;
}

// 화면 표시 순서: 일찍 떠남 → 늦게 떠남 → 기타
export const STAGE_ORDER: StageDefinition[] = [
  { key: "interview-before", label: "인터뷰 전" },
  { key: "in-progress", label: "중간" },
  { key: "after-pass", label: "합격 후 취소" },
  { key: "other", label: "기타 단계" },
];

export function mapFinalResultToStage(finalResult: string): StageKey {
  const normalized = finalResult.replace(/\s+/g, "");

  if (normalized.includes("인터뷰전") || normalized.includes("인터뷰노쇼")) {
    return "interview-before";
  }
  if (normalized.includes("합격취소")) {
    return "after-pass";
  }
  if (normalized.includes("신청취소")) {
    return "in-progress";
  }

  return "other";
}

// ── 세그먼트 내 사유 분포 계산 ──
function buildCauseShares(causes: string[], topCauses: number): CauseShare[] {
  const counts = new Map<string, number>();
  for (const cause of causes) {
    const label = cause.trim();
    if (label === "") continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const total = causes.length;

  return [...counts.entries()]
    .map(([cause, count]) => ({
      cause,
      count,
      percentage: total === 0 ? 0 : Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.cause.localeCompare(b.cause))
    .slice(0, topCauses);
}

interface SegmentBuckets {
  // 라벨 → 해당 세그먼트에 속한 행들의 primaryCause 목록
  order: string[];
  byLabel: Map<string, string[]>;
}

function bucketRows(rows: DashboardRow[], getLabel: (row: DashboardRow) => string): SegmentBuckets {
  const byLabel = new Map<string, string[]>();
  const order: string[] = [];

  for (const row of rows) {
    const rawLabel = getLabel(row);
    const label = rawLabel.trim() === "" ? UNKNOWN_SEGMENT_LABEL : rawLabel.trim();

    if (!byLabel.has(label)) {
      byLabel.set(label, []);
      order.push(label);
    }

    byLabel.get(label)!.push((row.primaryCause ?? "").trim());
  }

  return { order, byLabel };
}

// ── 유입경로별: 인원 많은 상위 N개 + 나머지는 "기타" ──
export function buildInflowBreakdown(
  rows: DashboardRow[],
  options: { maxSegments?: number; topCauses?: number } = {},
): SegmentBreakdown[] {
  const maxSegments = options.maxSegments ?? DEFAULT_MAX_SEGMENTS;
  const topCauses = options.topCauses ?? DEFAULT_TOP_CAUSES;

  const { byLabel } = bucketRows(rows, (row) => readSourceField(row.source, INFLOW_COLUMN));

  const sorted = [...byLabel.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );

  const kept = sorted.slice(0, maxSegments);
  const overflow = sorted.slice(maxSegments);

  const segments: SegmentBreakdown[] = kept.map(([label, causes]) => ({
    key: label,
    label,
    total: causes.length,
    topCauses: buildCauseShares(causes, topCauses),
  }));

  if (overflow.length > 0) {
    const merged = overflow.flatMap(([, causes]) => causes);
    segments.push({
      key: OTHER_SEGMENT_LABEL,
      label: OTHER_SEGMENT_LABEL,
      total: merged.length,
      topCauses: buildCauseShares(merged, topCauses),
    });
  }

  return segments;
}

// ── 한 줄 결론 (계산된 세그먼트에서 자동 생성, 외부 AI 호출 없음) ──
const NON_INSIGHT_CAUSES = new Set(["정보 부족", "분류 실패", "검토 필요", ""]);

function pickHeadlineSegments(segments: SegmentBreakdown[]): SegmentBreakdown[] {
  return segments
    .filter((segment) => {
      if (segment.label === OTHER_SEGMENT_LABEL || segment.label === UNKNOWN_SEGMENT_LABEL) {
        return false;
      }
      const top = segment.topCauses[0];
      return top != null && !NON_INSIGHT_CAUSES.has(top.cause);
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 2);
}

export function buildHeadline(segments: SegmentBreakdown[]): string {
  const picked = pickHeadlineSegments(segments);

  if (picked.length === 0) {
    return "세그먼트별 차이를 보여줄 데이터가 아직 부족해요.";
  }

  if (picked.length === 1) {
    const [only] = picked;
    return `${only.label}로 온 분들은 '${only.topCauses[0].cause}'이(가) 가장 큰 취소 이유예요.`;
  }

  const [first, second] = picked;
  const firstCause = first.topCauses[0].cause;
  const secondCause = second.topCauses[0].cause;

  if (firstCause === secondCause) {
    return `${first.label}·${second.label} 모두 '${firstCause}'이(가) 가장 큰 취소 이유예요.`;
  }

  return `${first.label}는 '${firstCause}', ${second.label}는 '${secondCause}'이(가) 가장 큰 취소 이유예요.`;
}

// ── 단계별: 최종결과를 단계로 매핑, 고정 순서, 빈 단계는 제외 ──
export function buildStageBreakdown(
  rows: DashboardRow[],
  options: { topCauses?: number } = {},
): SegmentBreakdown[] {
  const topCauses = options.topCauses ?? DEFAULT_TOP_CAUSES;

  const causesByStage = new Map<StageKey, string[]>();
  for (const row of rows) {
    const stage = mapFinalResultToStage(readSourceField(row.source, FINAL_RESULT_COLUMN));
    if (!causesByStage.has(stage)) causesByStage.set(stage, []);
    causesByStage.get(stage)!.push((row.primaryCause ?? "").trim());
  }

  return STAGE_ORDER.flatMap((stage) => {
    const causes = causesByStage.get(stage.key);
    if (!causes || causes.length === 0) return [];

    return [
      {
        key: stage.key,
        label: stage.label,
        total: causes.length,
        topCauses: buildCauseShares(causes, topCauses),
      },
    ];
  });
}
