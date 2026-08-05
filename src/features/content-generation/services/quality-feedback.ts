/**
 * Sprint 18.1 — human quality review, audit-only. Validates/builds a
 * `QualityFeedback` payload (see run-warnings.ts) that gets merged into
 * `AiGenerationRun.warnings`. Never changes `proposalStatus` and never
 * triggers apply/publish — this is feedback about a proposal, not an
 * action on it.
 */

import { ContentGenerationError } from "@/features/content-generation/contracts/generation.types";
import type { QualityFeedback } from "@/features/content-generation/services/run-warnings";

export type QualityFeedbackInput = {
  rating: number;
  helpful: boolean | null;
  needsRewrite: boolean | null;
  wrongFacts: boolean | null;
  tooVerbose: boolean | null;
  note: string | null;
};

const MAX_NOTE_LENGTH = 2_000;

function asOptionalBoolean(raw: unknown): boolean | null {
  return typeof raw === "boolean" ? raw : null;
}

/** Throws INVALID_REQUEST for a missing/out-of-range rating; every other field is best-effort/nullable. */
export function validateQualityFeedbackInput(raw: unknown): QualityFeedbackInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ContentGenerationError("Yêu cầu đánh giá chất lượng không hợp lệ.", "INVALID_REQUEST");
  }
  const o = raw as Record<string, unknown>;
  const rating = typeof o.rating === "number" ? Math.round(o.rating) : NaN;
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new ContentGenerationError("rating phải là số nguyên từ 1 đến 5.", "INVALID_REQUEST");
  }

  return {
    rating,
    helpful: asOptionalBoolean(o.helpful),
    needsRewrite: asOptionalBoolean(o.needsRewrite),
    wrongFacts: asOptionalBoolean(o.wrongFacts),
    tooVerbose: asOptionalBoolean(o.tooVerbose),
    note: typeof o.note === "string" ? o.note.trim().slice(0, MAX_NOTE_LENGTH) || null : null,
  };
}

export function buildQualityFeedback(
  input: QualityFeedbackInput,
  submittedBy: string | null,
  now: Date = new Date(),
): QualityFeedback {
  return { ...input, submittedAt: now.toISOString(), submittedBy };
}
