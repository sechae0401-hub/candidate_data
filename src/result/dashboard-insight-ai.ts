// 세그먼트별 AI 해석 인사이트 — 프롬프트 생성 + 응답 파싱 (서버 전용 로직, 순수 함수).
// 관찰(observation) → 추정 원인(hypothesis) → 추천 액션(action) 형태로 GPT가 해석한다.
// 집계 결과(SegmentBreakdown)를 입력으로 받아 외부 AI를 1회 호출한다.

import { z } from "zod";

import { ApiError } from "@/lib/api-handler";
import type { SegmentBreakdown } from "@/result/dashboard-insights";

export interface SegmentInsight {
  segment: string; // 어느 세그먼트에 대한 해석인지 (입력 라벨과 일치)
  observation: string; // 관찰: 가장 두드러진 사실
  hypothesis: string; // 추정 원인 (단정하지 않음)
  action: string; // 추천 액션 (실행 가능한 1가지)
}

const SegmentInsightResponseSchema = z.object({
  insights: z
    .array(
      z.object({
        segment: z.string().trim().min(1),
        observation: z.string().trim().min(1),
        hypothesis: z.string().trim().min(1),
        action: z.string().trim().min(1),
      }),
    )
    .min(1),
});

// 해석 대상에서 제외할 세그먼트 (액션으로 이어지지 않음)
const NON_ACTIONABLE_LABELS = new Set(["기타", "미입력", "기타 단계"]);

export function selectSegmentsForInsight(
  segments: SegmentBreakdown[],
  limit = 4,
): SegmentBreakdown[] {
  return segments
    .filter((segment) => segment.total > 0 && !NON_ACTIONABLE_LABELS.has(segment.label))
    .slice(0, limit);
}

export function buildSegmentInsightPrompt(tabLabel: string, segments: SegmentBreakdown[]): string {
  const segmentData = segments.map((segment) => ({
    segment: segment.label,
    total: segment.total,
    topCauses: segment.topCauses.map((cause) => ({
      cause: cause.cause,
      percentage: cause.percentage,
    })),
  }));

  return [
    "당신은 교육과정 운영 데이터를 해석하는 분석가입니다.",
    `아래는 취소자를 '${tabLabel}' 기준으로 나눈 뒤, 각 그룹에서 가장 많이 나온 취소 사유 분포입니다.`,
    "",
    "각 그룹마다 아래 세 가지를 한국어로 작성하세요.",
    "- observation: 그 그룹에서 가장 두드러진 사실 (예: \"비용 부담이 1위(50%)\"). 1문장.",
    "- hypothesis: 왜 그런 패턴이 나타나는지에 대한 합리적 추정. 반드시 '~로 추정', '~일 수 있음'처럼 단정하지 말 것. 1~2문장.",
    "- action: 운영 담당자가 바로 실행할 수 있는 구체적인 권장 조치 1가지. 1문장.",
    "",
    "주의사항:",
    "- 추측을 사실처럼 단정하지 마세요.",
    "- 데이터에 없는 수치를 지어내지 마세요.",
    "- segment 값은 입력으로 준 그룹 이름과 정확히 동일하게 사용하세요.",
    "- 반드시 JSON만 응답하세요. 마크다운 코드블록은 쓰지 마세요.",
    "",
    JSON.stringify(
      {
        responseShape: {
          insights: [
            {
              segment: "SNS 광고",
              observation: "비용 부담이 1위(50%)",
              hypothesis:
                "광고만 보고 충분히 알아보지 않은 채 신청해 자부담금 발생을 미처 몰랐던 것으로 추정",
              action: "SNS 광고 유입자에게는 인터뷰 전에 자부담금을 명확히 안내",
            },
          ],
        },
        tab: tabLabel,
        segments: segmentData,
      },
      null,
      2,
    ),
  ].join("\n");
}

export function parseSegmentInsightResponse(response: { output_text?: string | null }): SegmentInsight[] {
  if (!response.output_text) {
    throw new ApiError("AI 인사이트 결과를 읽지 못했습니다.", 502);
  }

  try {
    const parsed: unknown = JSON.parse(response.output_text);
    const direct = SegmentInsightResponseSchema.safeParse(parsed);
    if (direct.success) return direct.data.insights;

    const wrapped = SegmentInsightResponseSchema.safeParse(
      (parsed as Record<string, unknown>).responseShape,
    );
    if (wrapped.success) return wrapped.data.insights;

    console.error("Invalid dashboard insight JSON output:", parsed);
    throw new ApiError("AI 인사이트 결과 형식이 올바르지 않습니다.", 502);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Invalid dashboard insight JSON output:", error);
    throw new ApiError("AI 인사이트 결과 형식이 올바르지 않습니다.", 502);
  }
}
