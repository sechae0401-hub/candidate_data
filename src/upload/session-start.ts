import { z } from "zod";

import { ApiError } from "@/lib/api-handler";
import type { Database } from "@/shared/types/database.types";

export const CreateSessionRequestSchema = z.object({
  cohortName: z.string().trim().max(120).optional().nullable(),
  totalRows: z.number().int().nonnegative(),
  excludedRows: z.number().int().nonnegative(),
  selectedResultValues: z.array(z.string().trim().min(1)).min(1),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export function buildSessionInsertPayload(
  request: CreateSessionRequest,
): Database["public"]["Tables"]["sessions"]["Insert"] {
  const parsedRequest = CreateSessionRequestSchema.safeParse(request);

  if (!parsedRequest.success) {
    throw new ApiError("분류 세션 요청이 올바르지 않습니다.", 400);
  }

  return {
    cohort_name: parsedRequest.data.cohortName?.trim() || null,
    total_rows: parsedRequest.data.totalRows,
    excluded_rows: parsedRequest.data.excludedRows,
    selected_result_values: parsedRequest.data.selectedResultValues,
    status: "queued",
  };
}
