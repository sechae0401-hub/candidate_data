import { z } from "zod";

import type { ResultReviewState, ResultRowSummary } from "@/result/result-summary";

export type EditableResultField = "primaryCause" | "secondaryAction" | "detailTags";

export const ResultUpdateRequestSchema = z
  .object({
    resultId: z.string().min(1),
    primaryCause: z.string().trim().nullable().optional(),
    secondaryAction: z.string().trim().nullable().optional(),
    detailTags: z.string().trim().nullable().optional(),
    needsReview: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    const hasPatch =
      value.primaryCause !== undefined ||
      value.secondaryAction !== undefined ||
      value.detailTags !== undefined ||
      value.needsReview !== undefined;

    if (!hasPatch) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "수정할 필드가 없습니다.",
      });
    }
  });

export type ResultUpdateRequest = z.infer<typeof ResultUpdateRequestSchema>;
export type ResultRowPatch = Omit<ResultUpdateRequest, "resultId">;

function normalizeEditableText(value: string) {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

export function buildEditableFieldPatch(field: EditableResultField, value: string): ResultRowPatch {
  return {
    [field]: normalizeEditableText(value),
  };
}

export function buildReviewStatePatch(nextState: ResultReviewState): ResultRowPatch {
  return {
    needsReview: nextState === "review",
  };
}

export function applyResultRowPatch(row: ResultRowSummary, patch: ResultRowPatch): ResultRowSummary {
  return {
    ...row,
    primaryCause: patch.primaryCause !== undefined ? patch.primaryCause : row.primaryCause,
    secondaryAction: patch.secondaryAction !== undefined ? patch.secondaryAction : row.secondaryAction,
    detailTags: patch.detailTags !== undefined ? patch.detailTags : row.detailTags,
    needsReview: patch.needsReview !== undefined ? patch.needsReview : row.needsReview,
    reviewCompleted: patch.needsReview !== undefined ? !patch.needsReview : row.reviewCompleted,
  };
}
