import { z } from "zod";

import { ApiError } from "@/lib/api-handler";

const TARGET_ANALYSIS_COLUMNS = [
  "이름",
  "유입경로",
  "인터뷰내용",
  "최종결과",
  "최종기수",
  "특이사항",
  "합격자등록",
] as const;

function normalizeColName(name: string) {
  return name.replace(/\s+/g, "").trim().toLowerCase();
}

function filterColumnsForAnalysis(columns: string[]): string[] {
  const targets = TARGET_ANALYSIS_COLUMNS.map(normalizeColName);
  return columns.filter((col) => targets.includes(normalizeColName(col)));
}

const UploadRowRecordSchema = z.record(
  z.string().max(200),
  z.preprocess((val) => (typeof val === "string" ? val : String(val ?? "")), z.string()),
);

export const AnalyzeColumnsRequestSchema = z.object({
  columns: z.array(z.string().trim().min(1)).min(1),
  sampleRows: z.array(UploadRowRecordSchema).max(3),
});

export const ColumnAnalysisItemSchema = z.object({
  columnName: z.string().trim().min(1),
  understanding: z.string().trim().min(1),
});

const ColumnAnalysisPayloadSchema = z.object({
  columnAnalyses: z.array(ColumnAnalysisItemSchema).min(1),
});

export type AnalyzeColumnsRequest = z.infer<typeof AnalyzeColumnsRequestSchema>;
export type ColumnAnalysisItem = z.infer<typeof ColumnAnalysisItemSchema>;

type OpenAiTextResponse = {
  output_text?: string | null;
};

const SAMPLE_VALUE_MAX = 200;

function formatSampleRows(sampleRows: AnalyzeColumnsRequest["sampleRows"]) {
  if (sampleRows.length === 0) {
    return "샘플 행 없음";
  }

  return sampleRows
    .map((row, index) => {
      const truncated = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [
          k,
          v.length > SAMPLE_VALUE_MAX ? `${v.slice(0, SAMPLE_VALUE_MAX)}…` : v,
        ]),
      );
      return `행 ${index + 1}: ${JSON.stringify(truncated, null, 2)}`;
    })
    .join("\n");
}

export function buildColumnAnalysisPrompt({ columns, sampleRows }: AnalyzeColumnsRequest) {
  return [
    "당신은 업로드된 엑셀 컬럼의 의미를 설명하는 도우미입니다.",
    "반드시 JSON만 응답하세요.",
    '응답 형식: {"columnAnalyses":[{"columnName":"컬럼명","understanding":"AI가 이해한 설명"}]}',
    `컬럼 목록: ${columns.join(", ")}`,
    `샘플 행:\n${formatSampleRows(sampleRows)}`,
    "각 컬럼의 의미를 한국어 한 문장으로 설명하세요.",
  ].join("\n\n");
}

export function parseColumnAnalysisResponse(response: OpenAiTextResponse) {
  if (!response.output_text) {
    throw new ApiError("AI 분석 결과를 읽지 못했습니다.", 500);
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(response.output_text);
  } catch (error) {
    console.error("Invalid OpenAI JSON output:", error);
    throw new ApiError("AI 분석 결과 형식이 올바르지 않습니다.", 500);
  }

  const payload = ColumnAnalysisPayloadSchema.safeParse(parsedJson);

  if (!payload.success) {
    throw new ApiError("AI 분석 결과 형식이 올바르지 않습니다.", 500);
  }

  return payload.data.columnAnalyses;
}

export async function analyzeWorkbookColumns(
  request: AnalyzeColumnsRequest,
  requestRunner: (input: string) => Promise<OpenAiTextResponse>,
) {
  const normalizedRequest = AnalyzeColumnsRequestSchema.safeParse(request);

  if (!normalizedRequest.success) {
    throw new ApiError("업로드 컬럼 분석 요청이 올바르지 않습니다.", 400);
  }

  const filteredColumns = filterColumnsForAnalysis(normalizedRequest.data.columns);
  const analysisColumns = filteredColumns.length > 0 ? filteredColumns : normalizedRequest.data.columns;
  const filteredSampleRows = normalizedRequest.data.sampleRows.map((row) =>
    Object.fromEntries(Object.entries(row).filter(([key]) => analysisColumns.includes(key))),
  );

  const response = await requestRunner(
    buildColumnAnalysisPrompt({ columns: analysisColumns, sampleRows: filteredSampleRows }),
  );
  return parseColumnAnalysisResponse(response);
}
