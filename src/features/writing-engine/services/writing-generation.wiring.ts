import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parsePlanJson, parseDraftJson } from "@/features/writing-engine/services/writing-engine.wiring";
import type {
  DraftRecordLite,
  GenerationOrchestratorStore,
  GenerationRunRecord,
  SectionGenerationRecord,
} from "@/features/writing-engine/services/writing-generation-orchestrator.service";
import type { WritingPlan, WritingStructuredDraft } from "@/features/writing-engine/writing-engine.types";

function mapRun(row: {
  id: string;
  writingPlanId: string;
  writingDraftId: string | null;
  status: string;
  provider: string;
  model: string;
  configurationVersion: string;
  requestedBy: string | null;
  requestedSectionIds: string[];
  completedSectionIds: string[];
  failedSectionIds: string[];
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: unknown;
  latencyMs: number | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): GenerationRunRecord {
  return {
    ...row,
    status: row.status as GenerationRunRecord["status"],
    estimatedCostUsd:
      row.estimatedCostUsd == null ? null : Number(row.estimatedCostUsd),
  };
}

function mapSection(row: {
  id: string;
  generationRunId: string;
  writingPlanId: string;
  writingDraftId: string | null;
  sectionId: string;
  sectionKey: string;
  status: string;
  trigger: string;
  attempt: number;
  provider: string;
  model: string;
  requestHash: string;
  requestSnapshot: unknown;
  outputJson: unknown;
  validationIssues: unknown;
  qaIssues: unknown;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: unknown;
  latencyMs: number | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): SectionGenerationRecord {
  return {
    ...row,
    status: row.status as SectionGenerationRecord["status"],
    trigger: row.trigger as SectionGenerationRecord["trigger"],
    estimatedCostUsd:
      row.estimatedCostUsd == null ? null : Number(row.estimatedCostUsd),
  };
}

export function createPrismaGenerationOrchestratorStore(): GenerationOrchestratorStore {
  return {
    async findPlan(planId) {
      const row = await prisma.writingPlanRecord.findUnique({ where: { id: planId } });
      if (!row?.planJson) return null;
      const plan = parsePlanJson(row as never);
      return { plan: { ...plan, id: row.id }, planHash: row.planHash ?? plan.planHash };
    },
    async findDraft(draftId) {
      const row = await prisma.writingDraftRecord.findUnique({ where: { id: draftId } });
      if (!row) return null;
      return row as DraftRecordLite;
    },
    async findActiveRunForDraft(draftId) {
      const row = await prisma.writingGenerationRun.findFirst({
        where: { writingDraftId: draftId, status: { in: ["PENDING", "RUNNING"] } },
        orderBy: { createdAt: "desc" },
      });
      return row ? mapRun(row) : null;
    },
    async findActiveSectionAttempt(draftId, sectionId) {
      const row = await prisma.writingSectionGeneration.findFirst({
        where: {
          writingDraftId: draftId,
          sectionId,
          status: { in: ["PENDING", "READY", "RUNNING"] },
        },
        orderBy: { createdAt: "desc" },
      });
      return row ? mapSection(row) : null;
    },
    async countRunsToday(requestedBy) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return prisma.writingGenerationRun.count({
        where: {
          createdAt: { gte: start },
          ...(requestedBy ? { requestedBy } : {}),
        },
      });
    },
    async findSuccessfulByRequestHash(draftId, sectionId, requestHash) {
      const row = await prisma.writingSectionGeneration.findFirst({
        where: {
          writingDraftId: draftId,
          sectionId,
          requestHash,
          status: "GENERATED",
        },
        orderBy: { createdAt: "desc" },
      });
      return row ? mapSection(row) : null;
    },
    async createRun(data) {
      const row = await prisma.writingGenerationRun.create({
        data: {
          writingPlanId: data.writingPlanId,
          writingDraftId: data.writingDraftId,
          status: data.status as never,
          provider: data.provider,
          model: data.model,
          configurationVersion: data.configurationVersion,
          requestedBy: data.requestedBy,
          requestedSectionIds: data.requestedSectionIds,
          completedSectionIds: data.completedSectionIds,
          failedSectionIds: data.failedSectionIds,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          totalTokens: data.totalTokens,
          estimatedCostUsd: data.estimatedCostUsd,
          latencyMs: data.latencyMs,
          errorMessage: data.errorMessage,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
        },
      });
      return mapRun(row);
    },
    async updateRun(id, data) {
      const row = await prisma.writingGenerationRun.update({
        where: { id },
        data: {
          status: data.status as never,
          completedSectionIds: data.completedSectionIds,
          failedSectionIds: data.failedSectionIds,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          totalTokens: data.totalTokens,
          estimatedCostUsd: data.estimatedCostUsd,
          latencyMs: data.latencyMs,
          errorMessage: data.errorMessage,
          completedAt: data.completedAt,
        },
      });
      return mapRun(row);
    },
    async createSection(data) {
      const row = await prisma.writingSectionGeneration.create({
        data: {
          generationRunId: data.generationRunId,
          writingPlanId: data.writingPlanId,
          writingDraftId: data.writingDraftId,
          sectionId: data.sectionId,
          sectionKey: data.sectionKey,
          status: data.status as never,
          trigger: data.trigger as never,
          attempt: data.attempt,
          provider: data.provider,
          model: data.model,
          requestHash: data.requestHash,
          requestSnapshot: data.requestSnapshot as Prisma.InputJsonValue,
          outputJson: data.outputJson as Prisma.InputJsonValue,
          validationIssues: data.validationIssues as Prisma.InputJsonValue,
          qaIssues: data.qaIssues as Prisma.InputJsonValue,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          totalTokens: data.totalTokens,
          estimatedCostUsd: data.estimatedCostUsd,
          latencyMs: data.latencyMs,
          errorMessage: data.errorMessage,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
        },
      });
      return mapSection(row);
    },
    async updateSection(id, data) {
      const row = await prisma.writingSectionGeneration.update({
        where: { id },
        data: {
          status: data.status as never,
          attempt: data.attempt,
          outputJson: data.outputJson as Prisma.InputJsonValue,
          validationIssues: data.validationIssues as Prisma.InputJsonValue,
          qaIssues: data.qaIssues as Prisma.InputJsonValue,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          totalTokens: data.totalTokens,
          estimatedCostUsd: data.estimatedCostUsd,
          latencyMs: data.latencyMs,
          errorMessage: data.errorMessage,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
        },
      });
      return mapSection(row);
    },
    async listSectionsForRun(runId) {
      const rows = await prisma.writingSectionGeneration.findMany({
        where: { generationRunId: runId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(mapSection);
    },
    async getRun(runId) {
      const row = await prisma.writingGenerationRun.findUnique({ where: { id: runId } });
      return row ? mapRun(row) : null;
    },
    async listRunsForDraft(draftId) {
      const rows = await prisma.writingGenerationRun.findMany({
        where: { writingDraftId: draftId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return rows.map(mapRun);
    },
    async updateDraft(draftId, data) {
      const row = await prisma.writingDraftRecord.update({
        where: { id: draftId },
        data: {
          ...(data.status !== undefined ? { status: data.status as never } : {}),
          ...(data.structuredDraft !== undefined
            ? { structuredDraft: data.structuredDraft as Prisma.InputJsonValue }
            : {}),
          ...(data.qaReport !== undefined ? { qaReport: data.qaReport as Prisma.InputJsonValue } : {}),
          ...(data.renderedHtml !== undefined ? { renderedHtml: data.renderedHtml } : {}),
          ...(data.renderedMarkdown !== undefined ? { renderedMarkdown: data.renderedMarkdown } : {}),
          ...(data.version !== undefined ? { version: data.version } : {}),
          ...(data.sectionLocks !== undefined
            ? { sectionLocks: data.sectionLocks as Prisma.InputJsonValue }
            : {}),
          ...(data.latestGenerationRunId !== undefined
            ? { latestGenerationRunId: data.latestGenerationRunId }
            : {}),
          ...(data.generatedSectionCount !== undefined
            ? { generatedSectionCount: data.generatedSectionCount }
            : {}),
          ...(data.failedSectionCount !== undefined
            ? { failedSectionCount: data.failedSectionCount }
            : {}),
        },
      });
      return row as DraftRecordLite;
    },
    async createDraftVersion(data) {
      await prisma.writingDraftVersion.create({
        data: {
          writingDraftId: data.writingDraftId,
          version: data.version,
          reason: data.reason,
          structuredDraft: data.structuredDraft as Prisma.InputJsonValue,
          qaReport: data.qaReport as Prisma.InputJsonValue,
          createdBy: data.createdBy,
        },
      });
    },
  };
}

export async function getWritingDraftForReview(draftId: string) {
  const draft = await prisma.writingDraftRecord.findUnique({ where: { id: draftId } });
  if (!draft) throw new Error("Draft not found");
  if (!["REVIEW_READY", "QA_FAILED"].includes(draft.status)) {
    throw new Error("Draft not eligible for review");
  }
  const plan = await prisma.writingPlanRecord.findUnique({ where: { id: draft.writingPlanId } });
  if (!plan) throw new Error("Plan not found");
  const structured = parseDraftJson(draft as never);
  const run = draft.latestGenerationRunId
    ? await prisma.writingGenerationRun.findUnique({ where: { id: draft.latestGenerationRunId } })
    : null;

  return {
    writingDraftId: draft.id,
    draftVersion: draft.version,
    writingPlanId: draft.writingPlanId,
    contextBuildId: plan.contextBuildId,
    structuredDraft: structured,
    qaReport: structured.qa,
    generationSummary: {
      provider: run?.provider ?? "unknown",
      model: run?.model ?? "unknown",
      cost: run?.estimatedCostUsd == null ? null : Number(run.estimatedCostUsd),
      sectionAttempts: await prisma.writingSectionGeneration.count({
        where: { writingDraftId: draftId },
      }),
    },
  };
}

export type { WritingPlan, WritingStructuredDraft };
