import { ApiError, withApiHandler } from "@/lib/api-handler";
import { runOpenAiJsonRequest } from "@/lib/gpt-client";
import { AnalyzeColumnsRequestSchema, analyzeWorkbookColumns } from "@/upload/column-analysis";

export async function POST(request: Request) {
  return withApiHandler(
    async () => {
      const rawBody: unknown = await request.json();
      const parsed = AnalyzeColumnsRequestSchema.safeParse(rawBody);

      if (!parsed.success) {
        throw new ApiError("요청 형식이 올바르지 않습니다.", 400);
      }

      const columnAnalyses = await analyzeWorkbookColumns(parsed.data, runOpenAiJsonRequest);

      return { columnAnalyses };
    },
    {
      defaultErrorMessage: "AI 분석 중 오류가 발생했습니다.",
    },
  );
}
