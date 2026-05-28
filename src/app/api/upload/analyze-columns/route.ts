import { ApiError, withApiHandler } from "@/lib/api-handler";
import { runOpenAiJsonRequest } from "@/lib/gpt-client";
import { AnalyzeColumnsRequestSchema, analyzeWorkbookColumns } from "@/upload/column-analysis";

export async function POST(request: Request) {
  return withApiHandler(
    async () => {
      const rawBody: unknown = await request.json();
      const parsed = AnalyzeColumnsRequestSchema.safeParse(rawBody);

      if (!parsed.success) {
        const userMessage = parsed.error.issues
          .map((issue) => {
            const columnName = issue.path.findLast((p) => typeof p === "string" && isNaN(Number(p)));
            const label = columnName ? `'${String(columnName)}' 항목` : "일부 항목";
            if (issue.code === "too_big") return `${label}의 내용이 너무 깁니다`;
            if (issue.code === "invalid_type") return `${label}에 처리할 수 없는 값이 있습니다`;
            return `${label}을 처리할 수 없습니다`;
          })
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .join(", ");
        throw new ApiError(`파일을 분석할 수 없습니다: ${userMessage}`, 400);
      }

      const columnAnalyses = await analyzeWorkbookColumns(parsed.data, runOpenAiJsonRequest);

      return { columnAnalyses };
    },
    {
      defaultErrorMessage: "AI 분석 중 오류가 발생했습니다.",
    },
  );
}
