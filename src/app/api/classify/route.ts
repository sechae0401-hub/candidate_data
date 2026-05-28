import { ApiError, withApiHandler } from "@/lib/api-handler";
import { runOpenAiJsonRequest } from "@/lib/gpt-client";
import { getSupabaseServerClient } from "@/shared/supabase/server";
import {
  buildClassificationResultInsertPayloads,
  buildNewCategoryInsertPayloads,
  ClassifyRequestSchema,
  classifyRows,
} from "@/classify/classification-engine";

export async function POST(request: Request) {
  return withApiHandler(
    async () => {
      const rawBody: unknown = await request.json();
      const parsed = ClassifyRequestSchema.safeParse(rawBody);

      if (!parsed.success) {
        throw new ApiError("분류 요청 형식이 올바르지 않습니다.", 400);
      }

      const classification = await classifyRows(parsed.data, runOpenAiJsonRequest);
      const supabase = getSupabaseServerClient();
      const resultPayloads = buildClassificationResultInsertPayloads(parsed.data.sessionId, classification.results);

      const { error: resultError } = await supabase.from("classification_results").insert(resultPayloads as never);

      if (resultError) {
        console.error("Classification result insert failed:", resultError);
        throw new ApiError("분류 결과를 저장하지 못했습니다.", 500);
      }

      const categoryPayloads = buildNewCategoryInsertPayloads(parsed.data.sessionId, classification.newCategories);

      if (categoryPayloads.length > 0) {
        const { error: categoryError } = await supabase.from("new_categories").insert(categoryPayloads as never);

        if (categoryError) {
          console.error("New category insert failed:", categoryError);
          throw new ApiError("신규 카테고리를 저장하지 못했습니다.", 500);
        }
      }

      return {
        processedCount: classification.processedCount,
        reviewCount: classification.reviewCount,
      };
    },
    {
      defaultErrorMessage: "분류 중 오류가 발생했습니다.",
    },
  );
}
