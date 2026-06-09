import { ApiError, withApiHandler } from "@/lib/api-handler";
import { runAiJsonRequest } from "@/lib/gpt-client";
import { readAiProvider } from "@/shared/env/server";
import { getSupabaseServerClient } from "@/shared/supabase/server";
import {
  buildClassificationResultInsertPayloads,
  buildNewCategoryInsertPayloads,
  ClassifyRequestSchema,
  classifyRows,
} from "@/classify/classification-engine";

function elapsedMilliseconds(start: number) {
  return Math.round(performance.now() - start);
}

export async function POST(request: Request) {
  return withApiHandler(
    async () => {
      const totalStart = performance.now();
      const rawBody: unknown = await request.json();
      const parsed = ClassifyRequestSchema.safeParse(rawBody);

      if (!parsed.success) {
        throw new ApiError("분류 요청 형식이 올바르지 않습니다.", 400);
      }

      const provider = readAiProvider();
      let promptBytes = 0;
      let aiMs = 0;
      const classification = await classifyRows(parsed.data, async (input) => {
        promptBytes += Buffer.byteLength(input, "utf8");
        const aiStart = performance.now();
        try {
          return await runAiJsonRequest(input, {
            retryOptions: {
              factor: 2,
              maxTimeout: 2000,
              minTimeout: 500,
            },
          });
        } finally {
          aiMs += elapsedMilliseconds(aiStart);
        }
      });
      const supabase = getSupabaseServerClient();
      const resultPayloads = buildClassificationResultInsertPayloads(
        parsed.data.sessionId,
        classification.results,
        parsed.data.rows,
      );

      const dbStart = performance.now();
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

      console.info("classification.batch.completed", {
        aiMs,
        dbMs: elapsedMilliseconds(dbStart),
        event: "classification.batch.completed",
        failedCount: classification.failedCount,
        promptBytes,
        provider,
        reviewCount: classification.reviewCount,
        rowCount: parsed.data.rows.length,
        sessionId: parsed.data.sessionId,
        totalMs: elapsedMilliseconds(totalStart),
      });

      return {
        failedCount: classification.failedCount,
        processedCount: classification.processedCount,
        reviewCount: classification.reviewCount,
      };
    },
    {
      defaultErrorMessage: "분류 중 오류가 발생했습니다.",
    },
  );
}
