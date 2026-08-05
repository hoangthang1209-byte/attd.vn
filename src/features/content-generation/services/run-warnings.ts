/**
 * Sprint 18.0 — `AiGenerationRun.warnings` is a free-form Json column that,
 * before this sprint, only ever held `string[]` (provider/validation
 * warning messages). To avoid a migration, rollback snapshots and
 * retry-link pointers are stored in the SAME column, but only ever added
 * *after* generation (at apply/retry time) — so every reader that consumes
 * `warnings` right after a proposal is generated (WritingSectionAiAssistant,
 * SectionProposalPanel) keeps seeing a plain string array unaffected.
 *
 * `normalizeRunWarnings` accepts either legacy shape (string[]) or the
 * richer object shape and always returns the same normalized structure —
 * pure, no server-only, safe to import from client components too.
 */

export type RollbackSnapshot = {
  draftId: string;
  sectionId: string;
  previousHtml: string | null;
  previousPlainText: string | null;
  previousVersion: number | null;
  capturedAt: string;
};

/**
 * Sprint 18.1 — human quality feedback recorded against a GENERATED/APPLIED
 * run, audit-only (never changes proposalStatus or triggers any mutation).
 * Stored in the same `warnings` envelope as everything else in this file.
 */
export type QualityFeedback = {
  rating: number;
  helpful: boolean | null;
  needsRewrite: boolean | null;
  wrongFacts: boolean | null;
  tooVerbose: boolean | null;
  note: string | null;
  submittedAt: string;
  submittedBy: string | null;
};

export type RunWarningsPayload = {
  messages: string[];
  rollbackSnapshot?: RollbackSnapshot | null;
  retryOfRunId?: string | null;
  retriedByRunId?: string | null;
  /** Sprint 18.1 — set only after a successful POST .../rollback, for prompt-metrics' rollback rate. */
  rolledBackAt?: string | null;
  /** Sprint 18.1 — latest human quality rating/feedback, see quality-feedback.ts. */
  qualityFeedback?: QualityFeedback | null;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export function normalizeRunWarnings(raw: unknown): RunWarningsPayload {
  if (isStringArray(raw)) return { messages: raw };

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      messages: isStringArray(o.messages) ? o.messages : [],
      rollbackSnapshot: (o.rollbackSnapshot ?? null) as RollbackSnapshot | null,
      retryOfRunId: typeof o.retryOfRunId === "string" ? o.retryOfRunId : null,
      retriedByRunId: typeof o.retriedByRunId === "string" ? o.retriedByRunId : null,
      rolledBackAt: typeof o.rolledBackAt === "string" ? o.rolledBackAt : null,
      qualityFeedback: (o.qualityFeedback ?? null) as QualityFeedback | null,
    };
  }

  return { messages: [] };
}

export function withRollbackSnapshot(raw: unknown, snapshot: RollbackSnapshot): RunWarningsPayload {
  return { ...normalizeRunWarnings(raw), rollbackSnapshot: snapshot };
}

export function withRetryOfRunId(raw: unknown, retryOfRunId: string): RunWarningsPayload {
  return { ...normalizeRunWarnings(raw), retryOfRunId };
}

export function withRetriedByRunId(raw: unknown, retriedByRunId: string): RunWarningsPayload {
  return { ...normalizeRunWarnings(raw), retriedByRunId };
}

/** Sprint 18.1 — marks that a rollback occurred, for prompt-metrics' rollback rate. Never removes other keys. */
export function withRolledBackAt(raw: unknown, rolledBackAtIso: string): RunWarningsPayload {
  return { ...normalizeRunWarnings(raw), rolledBackAt: rolledBackAtIso };
}

/** Sprint 18.1 — records the latest human quality rating/feedback. Audit-only; never mutates proposalStatus. */
export function withQualityFeedback(raw: unknown, feedback: QualityFeedback): RunWarningsPayload {
  return { ...normalizeRunWarnings(raw), qualityFeedback: feedback };
}
