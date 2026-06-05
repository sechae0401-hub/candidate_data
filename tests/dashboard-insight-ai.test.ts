import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSegmentInsightPrompt,
  parseSegmentInsightResponse,
  selectSegmentsForInsight,
} from "../src/result/dashboard-insight-ai";
import type { SegmentBreakdown } from "../src/result/dashboard-insights";

function segment(label: string, total: number): SegmentBreakdown {
  return {
    key: label,
    label,
    total,
    topCauses: [{ cause: "비용 부담", count: total, percentage: 100 }],
  };
}

test("selectSegmentsForInsight는 기타/미입력 세그먼트를 제외하고 상위만 남긴다", () => {
  const segments = [
    segment("SNS 광고", 14),
    segment("검색", 9),
    segment("미입력", 3),
    segment("기타", 2),
  ];

  const selected = selectSegmentsForInsight(segments);
  assert.deepEqual(
    selected.map((s) => s.label),
    ["SNS 광고", "검색"],
  );
});

test("selectSegmentsForInsight는 limit 개수만큼 자른다", () => {
  const segments = [
    segment("A", 10),
    segment("B", 9),
    segment("C", 8),
  ];
  assert.equal(selectSegmentsForInsight(segments, 2).length, 2);
});

test("buildSegmentInsightPrompt는 탭 라벨과 세그먼트 이름을 포함한다", () => {
  const prompt = buildSegmentInsightPrompt("유입경로별", [segment("SNS 광고", 14)]);
  assert.ok(prompt.includes("유입경로별"));
  assert.ok(prompt.includes("SNS 광고"));
  assert.ok(prompt.includes("observation"));
  assert.ok(prompt.includes("hypothesis"));
  assert.ok(prompt.includes("action"));
});

test("parseSegmentInsightResponse는 정상 JSON을 파싱한다", () => {
  const insights = parseSegmentInsightResponse({
    output_text: JSON.stringify({
      insights: [
        {
          segment: "SNS 광고",
          observation: "비용 부담이 1위",
          hypothesis: "충분히 알아보지 않고 신청한 것으로 추정",
          action: "인터뷰 전 자부담금 안내",
        },
      ],
    }),
  });
  assert.equal(insights.length, 1);
  assert.equal(insights[0].segment, "SNS 광고");
  assert.equal(insights[0].action, "인터뷰 전 자부담금 안내");
});

test("parseSegmentInsightResponse는 responseShape로 감싼 응답도 파싱한다", () => {
  const insights = parseSegmentInsightResponse({
    output_text: JSON.stringify({
      responseShape: {
        insights: [
          {
            segment: "검색",
            observation: "일정 충돌이 1위",
            hypothesis: "직장 병행 어려움으로 추정",
            action: "유연한 일정 옵션 안내",
          },
        ],
      },
    }),
  });
  assert.equal(insights[0].segment, "검색");
});

test("parseSegmentInsightResponse는 형식이 틀리면 에러를 던진다", () => {
  assert.throws(() => parseSegmentInsightResponse({ output_text: "{\"foo\":1}" }));
  assert.throws(() => parseSegmentInsightResponse({ output_text: null }));
});
