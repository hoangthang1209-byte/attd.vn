/**
 * Sprint 18.0 — proposal detail + status timeline. Pure: takes an
 * already-fetched ProposalRunRecord and derives everything else (timeline
 * points, rollback availability, retry links, latency) without touching
 * prisma — the DB fetch by id lives in proposal.wiring.ts's
 * getProposalDetail, which calls buildProposalDetail with the loaded row.
 */

import type { ContentGenerationProposalStatus } from "@/features/content-generation/contracts/generation.types";
import { normalizeRunWarnings, type RollbackSnapshot } from "@/features/content-generation/services/run-warnings";
import type { ProposalRunRecord } from "@/features/content-generation/services/proposal.service";
import {
  toSafeProposalDetail,
  type SafeProposalSummary,
} from "@/features/content-generation/services/proposal-summary.mapping";
import { extractProposalDisplay, type ProposalDisplay } from "@/features/content-generation/ux/proposal-display";

export type ProposalTimelinePointKey =
  | "requested"
  | "running"
  | "generated"
  | "validation_failed"
  | "applied"
  | "rejected"
  | "failed"
  | "cancelled";

export type ProposalTimelinePoint = {
  key: ProposalTimelinePointKey;
  label: string;
  at: string | null;
  done: boolean;
};

const TIMELINE_LABELS: Record<ProposalTimelinePointKey, string> = {
  requested: "Yêu cầu",
  running: "Đang tạo",
  generated: "Đã tạo",
  validation_failed: "Không đạt kiểm tra an toàn",
  applied: "Đã áp dụng",
  rejected: "Đã từ chối",
  failed: "Thất bại",
  cancelled: "Đã huỷ",
};

function point(key: ProposalTimelinePointKey, at: Date | null, done: boolean): ProposalTimelinePoint {
  return { key, label: TIMELINE_LABELS[key], at: at ? at.toISOString() : null, done };
}

type TimelineRunLike = {
  proposalStatus: ContentGenerationProposalStatus | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  appliedAt: Date | null;
  rejectedAt: Date | null;
};

/**
 * Derives ordered timeline points from timestamps + proposalStatus. Never
 * fabricates a timestamp: a not-yet-reached step gets `at: null, done:
 * false` rather than guessing.
 */
export function buildProposalTimeline(run: TimelineRunLike): ProposalTimelinePoint[] {
  const status = run.proposalStatus;
  const reachedRunning = status != null && status !== "REQUESTED";
  const reachedGenerated = status != null && status !== "REQUESTED" && status !== "RUNNING";

  const points: ProposalTimelinePoint[] = [
    point("requested", run.createdAt, true),
    point("running", run.startedAt, reachedRunning),
  ];

  if (status === "FAILED") {
    points.push(point("failed", run.completedAt, true));
    return points;
  }
  if (status === "CANCELLED") {
    points.push(point("cancelled", run.completedAt, true));
    return points;
  }

  const isValidationFailed = status === "VALIDATION_FAILED";
  points.push(point(isValidationFailed ? "validation_failed" : "generated", run.completedAt, reachedGenerated));

  if (status === "REJECTED") {
    points.push(point("rejected", run.rejectedAt, true));
  } else {
    const isApplied = status === "APPLIED" || status === "EDITED_AND_APPLIED";
    points.push(point("applied", run.appliedAt, isApplied));
  }

  return points;
}

export type ProposalDetailView = SafeProposalSummary & {
  output: unknown;
  inputSummary: unknown;
  display: ProposalDisplay;
  latencyMs: number | null;
  timeline: ProposalTimelinePoint[];
  rollbackAvailable: boolean;
  rollbackSnapshot: RollbackSnapshot | null;
  selection: unknown;
  retryOfRunId: string | null;
  retriedByRunId: string | null;
};

/** Full safe detail view for GET /api/content/generation/[id] and the proposal detail admin page. */
export function buildProposalDetail(run: ProposalRunRecord): ProposalDetailView {
  const base = toSafeProposalDetail(run);
  const warnings = normalizeRunWarnings(run.warnings);
  const inputSummary =
    run.inputSummary && typeof run.inputSummary === "object" ? (run.inputSummary as Record<string, unknown>) : {};
  const latencyMs =
    run.startedAt && run.completedAt ? Math.max(0, run.completedAt.getTime() - run.startedAt.getTime()) : null;

  return {
    ...base,
    inputSummary: run.inputSummary,
    display: extractProposalDisplay(run.type, run.output),
    latencyMs,
    timeline: buildProposalTimeline(run),
    rollbackAvailable: Boolean(warnings.rollbackSnapshot?.previousHtml),
    rollbackSnapshot: warnings.rollbackSnapshot ?? null,
    selection: inputSummary.selection ?? null,
    retryOfRunId: warnings.retryOfRunId ?? null,
    retriedByRunId: warnings.retriedByRunId ?? null,
  };
}
