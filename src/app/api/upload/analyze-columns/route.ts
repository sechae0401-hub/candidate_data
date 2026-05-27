import { withApiHandler } from "@/lib/api-handler";
import { runOpenAiJsonRequest } from "@/lib/gpt-client";
import { analyzeWorkbookColumns } from "@/upload/column-analysis";

export async function POST(request: Request) {
  return withApiHandler(
    async () => {
      const body = (await request.json()) as Parameters<typeof analyzeWorkbookColumns>[0];
      const columnAnalyses = await analyzeWorkbookColumns(body, runOpenAiJsonRequest);

      return { columnAnalyses };
    },
    {
      defaultErrorMessage: "AI 분석 중 오류가 발생했습니다.",
    },
  );
}
