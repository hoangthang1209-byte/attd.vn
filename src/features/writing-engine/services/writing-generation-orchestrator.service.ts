import type {
  WritingDraftStatus,
  WritingGenerationEvent,
  WritingGenerationMode,
  WritingGenerationRunStatus,
  WritingPlan,
  WritingQaReport,
  WritingSectionDraft,
  WritingSectionGenerationStatus,
  WritingSectionGenerationTrigger,
  WritingSectionLock,
  WritingSectionProvider,
  WritingStructuredDraft,
} from "@/features/writing-engine/writing-engine.types";
import { WRITING_SECTION_PROMPT_VERSION } from "@/features/writing-engine/writing-engine.types";
import {
  getWritingGenerationConfig,
  type WritingGenerationConfig,
} from "@/features/writing-engine/writing-generation-config";
import { resolveWritingSectionProvider } from "@/features/writing-engine/services/writing-provider-router.service";
import { buildSectionRequest } from "@/features/writing-engine/services/writing-mock-generator.service";
import { hashWritingSectionRequest, estimateGenerationCost } from "@/features/writing-engine/services/writing-generation-cost.service";
import {
  getSectionLock,
  isSectionLocked,
  parseSectionLocks,
} from "@/features/writing-engine/services/writing-section-lock.service";
import {
  isRetryableProviderError,
  isSafetyViolation,
  validateSectionDraft,
} from "@/features/writing-engine/services/writing-section-validator.service";
import { runSectionLevelQa } from "@/features/writing-engine/services/writing-section-qa.service";
import { runWritingQa } from "@/features/writing-engine/qa/writing-qa.service";
import { renderDraftOutputs } from "@/features/writing-engine/services/writing-engine.wiring";
import { sanitizeWritingSectionHtml, plainTextFromHtml } from "@/features/writing-engine/services/writing-section-sanitize.service";
import { countWords } from "@/features/writing-engine/writing-utils";

export class WritingGenerationError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "WritingGenerationError";
    this.code = code;
    this.status = status;
  }
}

export type GenerationRunRecord = {
  id: string;
  writingPlanId: string;
  writingDraftId: string | null;
  status: WritingGenerationRunStatus;
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
  estimatedCostUsd: number | null;
  latencyMs: number | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SectionGenerationRecord = {
  id: string;
  generationRunId: string;
  writingPlanId: string;
  writingDraftId: string | null;
  sectionId: string;
  sectionKey: string;
  status: WritingSectionGenerationStatus;
  trigger: WritingSectionGenerationTrigger;
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
  estimatedCostUsd: number | null;
  latencyMs: number | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DraftRecordLite = {
  id: string;
  writingPlanId: string;
  status: string;
  structuredDraft: unknown;
  qaReport: unknown;
  version: number;
  sectionLocks: unknown;
  latestGenerationRunId: string | null;
  generatedSectionCount: number;
  failedSectionCount: number;
};

export type GenerationOrchestratorStore = {
  findPlan(planId: string): Promise<{ plan: WritingPlan; planHash: string } | null>;
  findDraft(draftId: string): Promise<DraftRecordLite | null>;
  findActiveRunForDraft(draftId: string): Promise<GenerationRunRecord | null>;
  findActiveSectionAttempt(draftId: string, sectionId: string): Promise<SectionGenerationRecord | null>;
  countRunsToday(requestedBy?: string | null): Promise<number>;
  findSuccessfulByRequestHash(
    draftId: string,
    sectionId: string,
    requestHash: string
  ): Promise<SectionGenerationRecord | null>;
  createRun(data: Omit<GenerationRunRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<GenerationRunRecord>;
  updateRun(id: string, data: Partial<GenerationRunRecord>): Promise<GenerationRunRecord>;
  createSection(data: Omit<SectionGenerationRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<SectionGenerationRecord>;
  updateSection(id: string, data: Partial<SectionGenerationRecord>): Promise<SectionGenerationRecord>;
  listSectionsForRun(runId: string): Promise<SectionGenerationRecord[]>;
  getRun(runId: string): Promise<GenerationRunRecord | null>;
  listRunsForDraft(draftId: string): Promise<GenerationRunRecord[]>;
  updateDraft(
    draftId: string,
    data: {
      status?: string;
      structuredDraft?: WritingStructuredDraft;
      qaReport?: WritingQaReport;
      renderedHtml?: string | null;
      renderedMarkdown?: string | null;
      version?: number;
      sectionLocks?: WritingSectionLock[];
      latestGenerationRunId?: string | null;
      generatedSectionCount?: number;
      failedSectionCount?: number;
    }
  ): Promise<DraftRecordLite>;
  createDraftVersion(data: {
    writingDraftId: string;
    version: number;
    reason: string;
    structuredDraft: WritingStructuredDraft;
    qaReport?: WritingQaReport | null;
    createdBy?: string | null;
  }): Promise<void>;
};

export type StartGenerationInput = {
  writingPlanId: string;
  draftId: string;
  mode: WritingGenerationMode;
  sectionIds?: string[];
  regenerate?: boolean;
  confirmLockedOverwrite?: boolean;
  requestedBy?: string | null;
  trigger?: WritingSectionGenerationTrigger;
};

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function resolveSectionIds(
  plan: WritingPlan,
  draft: WritingStructuredDraft,
  locks: WritingSectionLock[],
  input: StartGenerationInput
): string[] {
  const allIds = plan.sections.map((s) => s.id);
  if (input.mode === "SELECTED") {
    return (input.sectionIds ?? []).filter((id) => allIds.includes(id));
  }
  if (input.mode === "FAILED_ONLY") {
    return allIds.filter((id) => {
      const section = draft.sections.find((s) => s.sectionId === id);
      return !section || !section.plainText.trim() || (section.warnings ?? []).some((w) => /fail/i.test(w));
    });
  }
  if (input.mode === "UNLOCKED_ONLY") {
    return allIds.filter((id) => !isSectionLocked(locks, id));
  }
  return allIds;
}

function emptyMetrics(): WritingQaReport["metrics"] {
  return {
    totalWords: 0,
    sectionCount: 0,
    requiredFactCoverage: 0,
    usedFactCount: 0,
    unsupportedClaimCount: 0,
    internalLinkCount: 0,
    mediaCount: 0,
    missingAltCount: 0,
    headingErrors: 0,
    keywordWarnings: 0,
  };
}

export async function startGenerationRun(
  input: StartGenerationInput,
  store: GenerationOrchestratorStore,
  options?: {
    config?: WritingGenerationConfig;
    provider?: WritingSectionProvider;
    providerName?: string;
    model?: string;
  }
): Promise<{
  run: GenerationRunRecord;
  sections: SectionGenerationRecord[];
  draft: WritingStructuredDraft;
  cacheReused: string[];
  skippedLocked: string[];
  events: WritingGenerationEvent[];
}> {
  const config = options?.config ?? getWritingGenerationConfig();
  const planRow = await store.findPlan(input.writingPlanId);
  if (!planRow) throw new WritingGenerationError("Writing plan not found", "PLAN_NOT_FOUND", 404);
  if (!planRow.plan.readiness.ready) {
    throw new WritingGenerationError("Plan chưa READY", "PLAN_NOT_READY", 422);
  }

  const draftRow = await store.findDraft(input.draftId);
  if (!draftRow) throw new WritingGenerationError("Draft not found", "DRAFT_NOT_FOUND", 404);
  if (draftRow.writingPlanId !== input.writingPlanId) {
    throw new WritingGenerationError("Draft/plan mismatch", "DRAFT_PLAN_MISMATCH", 400);
  }

  const active = await store.findActiveRunForDraft(input.draftId);
  if (active) {
    throw new WritingGenerationError(
      "Đã có generation run đang chạy cho draft này.",
      "ACTIVE_RUN_EXISTS",
      409
    );
  }

  const runsToday = await store.countRunsToday(input.requestedBy);
  if (runsToday >= config.dailyRunLimit) {
    throw new WritingGenerationError(
      `Đã vượt giới hạn generation trong ngày (${config.dailyRunLimit}).`,
      "DAILY_LIMIT",
      429
    );
  }

  let routeProvider = options?.provider ?? null;
  let providerName = options?.providerName ?? "fake";
  let model = options?.model ?? "fake-model";
  let configurationVersion = config.configurationVersion;

  if (!routeProvider) {
    const resolved = resolveWritingSectionProvider(config);
    routeProvider = resolved.provider;
    providerName = resolved.route.provider;
    model = resolved.route.model;
    configurationVersion = config.configurationVersion;
  }

  const locks = parseSectionLocks(draftRow.sectionLocks);
  const structured = draftRow.structuredDraft as WritingStructuredDraft;
  let sectionIds = resolveSectionIds(planRow.plan, structured, locks, input);

  if (sectionIds.length === 0) {
    throw new WritingGenerationError("Không có section nào để generate", "NO_SECTIONS", 400);
  }
  if (sectionIds.length > config.maxSectionsPerRun) {
    throw new WritingGenerationError(
      `Vượt max sections/run (${config.maxSectionsPerRun})`,
      "MAX_SECTIONS",
      400
    );
  }

  const skippedLocked: string[] = [];
  const confirmedOverwrite = input.confirmLockedOverwrite === true;
  sectionIds = sectionIds.filter((id) => {
    if (!isSectionLocked(locks, id)) return true;
    if (confirmedOverwrite && (input.regenerate || input.mode === "SELECTED")) return true;
    skippedLocked.push(id);
    return false;
  });

  if (sectionIds.length === 0) {
    throw new WritingGenerationError(
      "Tất cả section được chọn đang khóa. Cần confirmLockedOverwrite=true để ghi đè.",
      "ALL_LOCKED",
      409
    );
  }

  for (const sectionId of sectionIds) {
    const activeSec = await store.findActiveSectionAttempt(input.draftId, sectionId);
    if (activeSec) {
      throw new WritingGenerationError(
        `Section ${sectionId} đang được generate`,
        "ACTIVE_SECTION",
        409
      );
    }
  }

  const events: WritingGenerationEvent[] = [];
  const trigger: WritingSectionGenerationTrigger =
    input.trigger ?? (input.regenerate ? "REGENERATE" : "INITIAL");

  const run = await store.createRun({
    writingPlanId: input.writingPlanId,
    writingDraftId: input.draftId,
    status: "RUNNING",
    provider: providerName,
    model,
    configurationVersion,
    requestedBy: input.requestedBy ?? null,
    requestedSectionIds: sectionIds,
    completedSectionIds: [],
    failedSectionIds: [],
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    latencyMs: 0,
    errorMessage: null,
    startedAt: new Date(),
    completedAt: null,
  });

  events.push({
    timestamp: new Date().toISOString(),
    type: "RUN_CREATED",
    message: `Run created for ${sectionIds.length} sections`,
    metadata: { provider: providerName, model, promptVersion: WRITING_SECTION_PROMPT_VERSION },
  });

  await store.updateDraft(input.draftId, {
    status: "GENERATING",
    latestGenerationRunId: run.id,
  });

  const sectionRows: SectionGenerationRecord[] = [];
  const cacheReused: string[] = [];

  for (const sectionId of sectionIds) {
    const section = planRow.plan.sections.find((s) => s.id === sectionId)!;
    const request = buildSectionRequest(planRow.plan, sectionId);
    if (!request) continue;
    const requestHash = hashWritingSectionRequest({
      planHash: planRow.planHash,
      sectionId,
      request,
      provider: providerName,
      model,
    });

    if (!input.regenerate) {
      const cached = await store.findSuccessfulByRequestHash(input.draftId, sectionId, requestHash);
      if (cached?.outputJson) {
        cacheReused.push(sectionId);
        const row = await store.createSection({
          generationRunId: run.id,
          writingPlanId: input.writingPlanId,
          writingDraftId: input.draftId,
          sectionId,
          sectionKey: section.sectionKey,
          status: "GENERATED",
          trigger: "INITIAL",
          attempt: 1,
          provider: providerName,
          model,
          requestHash,
          requestSnapshot: { sectionId, hashed: true },
          outputJson: cached.outputJson,
          validationIssues: [],
          qaIssues: [],
          inputTokens: cached.inputTokens,
          outputTokens: cached.outputTokens,
          totalTokens: cached.totalTokens,
          estimatedCostUsd: cached.estimatedCostUsd,
          latencyMs: 0,
          errorMessage: null,
          startedAt: new Date(),
          completedAt: new Date(),
        });
        sectionRows.push(row);
        continue;
      }
    }

    const row = await store.createSection({
      generationRunId: run.id,
      writingPlanId: input.writingPlanId,
      writingDraftId: input.draftId,
      sectionId,
      sectionKey: section.sectionKey,
      status: "PENDING",
      trigger,
      attempt: 1,
      provider: providerName,
      model,
      requestHash,
      requestSnapshot: {
        sectionId,
        heading: request.heading,
        factIds: request.facts.map((f) => f.factId),
        promptVersion: WRITING_SECTION_PROMPT_VERSION,
      },
      outputJson: null,
      validationIssues: null,
      qaIssues: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCostUsd: null,
      latencyMs: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    });
    sectionRows.push(row);
  }

  // Apply cache reuse into draft immediately
  let workingDraft = { ...structured, sections: [...structured.sections] };
  for (const row of sectionRows.filter((s) => s.status === "GENERATED" && cacheReused.includes(s.sectionId))) {
    const draftSection = row.outputJson as WritingSectionDraft;
    workingDraft = upsertSection(workingDraft, draftSection);
  }

  const pending = sectionRows.filter((s) => s.status === "PENDING");
  let cancelled = false;

  const checkCancelled = async () => {
    const fresh = await store.getRun(run.id);
    if (fresh?.status === "CANCELLED") cancelled = true;
  };

  await mapPool(pending, config.maxParallelSections, async (row) => {
    await checkCancelled();
    if (cancelled) {
      await store.updateSection(row.id, { status: "CANCELLED", completedAt: new Date() });
      return;
    }

    const request = buildSectionRequest(planRow.plan, row.sectionId);
    if (!request) {
      await store.updateSection(row.id, {
        status: "FAILED",
        errorMessage: "Missing section request",
        completedAt: new Date(),
      });
      return;
    }

    events.push({
      timestamp: new Date().toISOString(),
      type: "SECTION_STARTED",
      sectionId: row.sectionId,
      message: `Generating ${row.sectionKey}`,
    });

    await store.updateSection(row.id, { status: "RUNNING", startedAt: new Date() });

    let attempt = 1;
    let lastError: string | null = null;
    let accepted: WritingSectionDraft | null = null;
    let usageAgg = { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0, latencyMs: 0 };
    let validationIssues: string[] = [];
    let lastFailedOutput: unknown = null;
    let qaIssues: unknown = [];

    while (attempt <= config.maxRetries + 1) {
      await checkCancelled();
      if (cancelled) {
        await store.updateSection(row.id, { status: "CANCELLED", completedAt: new Date() });
        return;
      }

      try {
        const useRepair =
          attempt > 1 &&
          validationIssues.length > 0 &&
          !isSafetyViolation(validationIssues) &&
          lastFailedOutput != null;

        const result = await routeProvider!.generateSection(
          request,
          useRepair
            ? {
                repairContext: {
                  previousOutput: lastFailedOutput,
                  validationIssues,
                },
              }
            : undefined
        );

        usageAgg.inputTokens += result.usage.inputTokens ?? 0;
        usageAgg.outputTokens += result.usage.outputTokens ?? 0;
        usageAgg.totalTokens += result.usage.totalTokens ?? 0;
        usageAgg.latencyMs += result.latencyMs;
        const cost =
          result.usage.estimatedCostUsd ??
          estimateGenerationCost({
            model,
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
          });
        if (cost != null) usageAgg.estimatedCostUsd += cost;

        const validation = validateSectionDraft(planRow.plan, result.draft, request);
        validationIssues = validation.errors;

        if (!validation.valid) {
          if (isSafetyViolation(validation.errors) || !validation.repairable) {
            lastError = validation.errors.join("; ");
            await store.updateSection(row.id, {
              status: "VALIDATION_FAILED",
              attempt,
              outputJson: result.draft,
              validationIssues: validation.errors,
              inputTokens: usageAgg.inputTokens,
              outputTokens: usageAgg.outputTokens,
              totalTokens: usageAgg.totalTokens,
              estimatedCostUsd: usageAgg.estimatedCostUsd || null,
              latencyMs: usageAgg.latencyMs,
              errorMessage: lastError,
              completedAt: new Date(),
            });
            events.push({
              timestamp: new Date().toISOString(),
              type: "SECTION_FAILED",
              sectionId: row.sectionId,
              message: lastError,
            });
            return;
          }
          lastFailedOutput = result.draft;
          lastError = validation.errors.join("; ");
          events.push({
            timestamp: new Date().toISOString(),
            type: "SECTION_RETRY",
            sectionId: row.sectionId,
            message: `Validation repair attempt ${attempt}`,
          });
          attempt += 1;
          continue;
        }

        const sectionQa = runSectionLevelQa(planRow.plan, result.draft);
        qaIssues = sectionQa;
        const blockingQa = sectionQa.filter((i) => i.severity === "BLOCKING" || i.severity === "ERROR");
        if (blockingQa.length > 0) {
          lastError = blockingQa.map((i) => i.message).join("; ");
          await store.updateSection(row.id, {
            status: "QA_FAILED",
            attempt,
            outputJson: result.draft,
            validationIssues: [],
            qaIssues: sectionQa,
            inputTokens: usageAgg.inputTokens,
            outputTokens: usageAgg.outputTokens,
            totalTokens: usageAgg.totalTokens,
            estimatedCostUsd: usageAgg.estimatedCostUsd || null,
            latencyMs: usageAgg.latencyMs,
            errorMessage: lastError,
            completedAt: new Date(),
          });
          events.push({
            timestamp: new Date().toISOString(),
            type: "SECTION_FAILED",
            sectionId: row.sectionId,
            message: lastError,
          });
          return;
        }

        accepted = result.draft;
        await store.updateSection(row.id, {
          status: "GENERATED",
          attempt,
          outputJson: accepted,
          validationIssues: [],
          qaIssues: sectionQa,
          inputTokens: usageAgg.inputTokens,
          outputTokens: usageAgg.outputTokens,
          totalTokens: usageAgg.totalTokens,
          estimatedCostUsd: usageAgg.estimatedCostUsd || null,
          latencyMs: usageAgg.latencyMs,
          errorMessage: null,
          completedAt: new Date(),
        });
        events.push({
          timestamp: new Date().toISOString(),
          type: "SECTION_COMPLETED",
          sectionId: row.sectionId,
          message: "Section accepted",
        });
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Provider error";
        if (isRetryableProviderError(lastError) && attempt <= config.maxRetries) {
          events.push({
            timestamp: new Date().toISOString(),
            type: "SECTION_RETRY",
            sectionId: row.sectionId,
            message: `Retry after: ${lastError}`,
          });
          attempt += 1;
          await new Promise((r) => setTimeout(r, Math.min(1000 * attempt, 3000)));
          continue;
        }
        await store.updateSection(row.id, {
          status: "FAILED",
          attempt,
          errorMessage: lastError,
          inputTokens: usageAgg.inputTokens || null,
          outputTokens: usageAgg.outputTokens || null,
          totalTokens: usageAgg.totalTokens || null,
          estimatedCostUsd: usageAgg.estimatedCostUsd || null,
          latencyMs: usageAgg.latencyMs || null,
          completedAt: new Date(),
        });
        events.push({
          timestamp: new Date().toISOString(),
          type: "SECTION_FAILED",
          sectionId: row.sectionId,
          message: lastError,
        });
        return;
      }
    }

    if (!accepted && lastError) {
      await store.updateSection(row.id, {
        status: "FAILED",
        attempt,
        errorMessage: lastError,
        completedAt: new Date(),
      });
    }
  });

  // Re-load sections and assemble
  const finalSections = await store.listSectionsForRun(run.id);
  const completedIds = finalSections.filter((s) => s.status === "GENERATED").map((s) => s.sectionId);
  const failedIds = finalSections
    .filter((s) =>
      ["FAILED", "VALIDATION_FAILED", "QA_FAILED"].includes(s.status)
    )
    .map((s) => s.sectionId);

  for (const sec of finalSections.filter((s) => s.status === "GENERATED" && s.outputJson)) {
    workingDraft = upsertSection(workingDraft, sec.outputJson as WritingSectionDraft);
  }

  // Preserve locked section content
  for (const lock of locks.filter((l) => l.locked)) {
    const existing = structured.sections.find((s) => s.sectionId === lock.sectionId);
    if (existing?.plainText.trim()) {
      workingDraft = upsertSection(workingDraft, existing);
    }
  }

  workingDraft = assembleInPlanOrder(planRow.plan, workingDraft);
  const qa = runWritingQa(planRow.plan, workingDraft);
  const requiredMissing = planRow.plan.sections
    .filter((s) => s.required)
    .some((s) => {
      const d = workingDraft.sections.find((x) => x.sectionId === s.id);
      return !d || !d.plainText.trim();
    });

  const blocking = qa.issues.filter((i) => i.severity === "BLOCKING" || i.severity === "ERROR");
  let draftStatus: WritingDraftStatus = "GENERATED";
  if (requiredMissing || blocking.length > 0 || !qa.passed) {
    draftStatus = "QA_FAILED";
  } else if (!requiredMissing && blocking.length === 0 && completedIds.length > 0) {
    draftStatus = "REVIEW_READY";
  }

  workingDraft = {
    ...workingDraft,
    qa,
    status: draftStatus,
    updatedAt: new Date().toISOString(),
  };

  const rendered = renderDraftOutputs(workingDraft);
  workingDraft.rendered = rendered;

  const nextVersion = draftRow.version + (completedIds.length > 0 ? 1 : 0);
  await store.updateDraft(input.draftId, {
    status: draftStatus,
    structuredDraft: workingDraft,
    qaReport: qa,
    renderedHtml: rendered.html,
    renderedMarkdown: rendered.markdown,
    version: nextVersion,
    latestGenerationRunId: run.id,
    generatedSectionCount: workingDraft.sections.filter((s) => s.plainText.trim()).length,
    failedSectionCount: failedIds.length,
  });

  if (completedIds.length > 0) {
    await store.createDraftVersion({
      writingDraftId: input.draftId,
      version: nextVersion,
      reason: input.regenerate ? "section_regeneration" : "generation_completion",
      structuredDraft: workingDraft,
      qaReport: qa,
      createdBy: input.requestedBy ?? null,
    });
  }

  const inputTokens = sum(finalSections.map((s) => s.inputTokens));
  const outputTokens = sum(finalSections.map((s) => s.outputTokens));
  const totalTokens = sum(finalSections.map((s) => s.totalTokens));
  const cost = sumNullable(finalSections.map((s) => s.estimatedCostUsd));
  const latency = sum(finalSections.map((s) => s.latencyMs));

  let runStatus: WritingGenerationRunStatus = "COMPLETED";
  const freshRun = await store.getRun(run.id);
  if (freshRun?.status === "CANCELLED") {
    runStatus = "CANCELLED";
  } else if (failedIds.length > 0 && completedIds.length > 0) {
    runStatus = "PARTIAL";
  } else if (failedIds.length > 0 && completedIds.length === 0) {
    runStatus = "FAILED";
  }

  const updatedRun = await store.updateRun(run.id, {
    status: runStatus,
    completedSectionIds: completedIds,
    failedSectionIds: failedIds,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd: cost,
    latencyMs: latency,
    completedAt: new Date(),
  });

  events.push({
    timestamp: new Date().toISOString(),
    type: runStatus === "CANCELLED" ? "RUN_CANCELLED" : "RUN_COMPLETED",
    message: `Run ${runStatus}`,
    metadata: { completed: completedIds.length, failed: failedIds.length },
  });

  for (const id of skippedLocked) {
    events.push({
      timestamp: new Date().toISOString(),
      type: "SECTION_LOCKED",
      sectionId: id,
      message: "Skipped locked section",
    });
  }

  return {
    run: updatedRun,
    sections: finalSections,
    draft: workingDraft,
    cacheReused,
    skippedLocked,
    events,
  };
}

function upsertSection(
  draft: WritingStructuredDraft,
  section: WritingSectionDraft
): WritingStructuredDraft {
  const sections = draft.sections.filter((s) => s.sectionId !== section.sectionId);
  sections.push(section);
  return { ...draft, sections };
}

function assembleInPlanOrder(plan: WritingPlan, draft: WritingStructuredDraft): WritingStructuredDraft {
  const byId = new Map(draft.sections.map((s) => [s.sectionId, s]));
  const sections = plan.sections.map((s) => {
    return (
      byId.get(s.id) ?? {
        sectionId: s.id,
        heading: s.heading,
        html: "",
        plainText: "",
        factIdsUsed: [],
        citationIdsUsed: [],
        internalLinkIdsUsed: [],
        mediaPlacementIdsUsed: [],
        keywordUsage: [],
        claims: [],
        wordCount: 0,
        warnings: ["PLACEHOLDER — not generated"],
      }
    );
  });
  return { ...draft, sections };
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce((a: number, b) => a + (b ?? 0), 0);
}

function sumNullable(values: Array<number | null | undefined>): number | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0) return null;
  return Number(present.reduce((a, b) => a + b, 0).toFixed(6));
}

export async function cancelGenerationRun(
  runId: string,
  store: GenerationOrchestratorStore
): Promise<GenerationRunRecord> {
  const run = await store.getRun(runId);
  if (!run) throw new WritingGenerationError("Run not found", "RUN_NOT_FOUND", 404);
  if (["COMPLETED", "FAILED", "CANCELLED"].includes(run.status)) {
    return run;
  }
  const sections = await store.listSectionsForRun(runId);
  for (const sec of sections) {
    if (["PENDING", "READY", "RUNNING"].includes(sec.status)) {
      await store.updateSection(sec.id, { status: "CANCELLED", completedAt: new Date() });
    }
  }
  return store.updateRun(runId, {
    status: "CANCELLED",
    completedAt: new Date(),
  });
}

export async function saveHumanEditedSection(
  input: {
    draftId: string;
    sectionId: string;
    html: string;
    plainText?: string;
    lockAfterSave?: boolean;
    editedBy?: string | null;
  },
  store: GenerationOrchestratorStore
): Promise<{ draft: WritingStructuredDraft; version: number }> {
  const draftRow = await store.findDraft(input.draftId);
  if (!draftRow) throw new WritingGenerationError("Draft not found", "DRAFT_NOT_FOUND", 404);
  const planRow = await store.findPlan(draftRow.writingPlanId);
  if (!planRow) throw new WritingGenerationError("Plan not found", "PLAN_NOT_FOUND", 404);

  const structured = draftRow.structuredDraft as WritingStructuredDraft;
  const section = planRow.plan.sections.find((s) => s.id === input.sectionId);
  if (!section) throw new WritingGenerationError("Section not found", "SECTION_NOT_FOUND", 404);

  const html = sanitizeWritingSectionHtml(input.html);
  const plainText = input.plainText?.trim() || plainTextFromHtml(html);
  const draftSection: WritingSectionDraft = {
    sectionId: input.sectionId,
    heading: section.heading,
    html,
    plainText,
    factIdsUsed: [],
    citationIdsUsed: [],
    internalLinkIdsUsed: [],
    mediaPlacementIdsUsed: [],
    keywordUsage: [],
    claims: [],
    wordCount: countWords(plainText),
    warnings: ["USER_EDITED"],
  };

  const validation = validateSectionDraft(planRow.plan, draftSection);
  // Human edits: allow empty fact IDs but reject unsafe HTML/URLs
  const hardErrors = validation.errors.filter((e) =>
    /Unsafe HTML|Arbitrary external|Disallowed URL|H1 injection|script/i.test(e)
  );
  if (hardErrors.length > 0) {
    throw new WritingGenerationError(hardErrors.join("; "), "INVALID_EDIT", 400);
  }

  let next = upsertSection(structured, draftSection);
  next = assembleInPlanOrder(planRow.plan, next);
  const qa = runWritingQa(planRow.plan, next);
  next = { ...next, qa, updatedAt: new Date().toISOString(), status: qa.passed ? "REVIEW_READY" : "QA_FAILED" };
  const rendered = renderDraftOutputs(next);
  next.rendered = rendered;

  let locks = parseSectionLocks(draftRow.sectionLocks);
  if (input.lockAfterSave !== false) {
    const { lockSection } = await import("@/features/writing-engine/services/writing-section-lock.service");
    locks = lockSection(locks, input.sectionId, "USER_EDITED", input.editedBy ?? null, "Saved by editor");
  }

  const version = draftRow.version + 1;
  await store.updateDraft(input.draftId, {
    structuredDraft: next,
    qaReport: qa,
    renderedHtml: rendered.html,
    renderedMarkdown: rendered.markdown,
    version,
    sectionLocks: locks,
    status: next.status,
  });
  await store.createDraftVersion({
    writingDraftId: input.draftId,
    version,
    reason: "human_save",
    structuredDraft: next,
    qaReport: qa,
    createdBy: input.editedBy ?? null,
  });

  return { draft: next, version };
}

export function buildGenerationStatus(run: GenerationRunRecord, sections: SectionGenerationRecord[]) {
  const counts = {
    pending: sections.filter((s) => s.status === "PENDING" || s.status === "READY").length,
    running: sections.filter((s) => s.status === "RUNNING").length,
    generated: sections.filter((s) => s.status === "GENERATED").length,
    failed: sections.filter((s) =>
      ["FAILED", "VALIDATION_FAILED", "QA_FAILED"].includes(s.status)
    ).length,
    cancelled: sections.filter((s) => s.status === "CANCELLED").length,
    locked: sections.filter((s) => s.status === "LOCKED").length,
  };
  return {
    runId: run.id,
    status: run.status,
    totalSections: sections.length,
    ...counts,
    usage: {
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens,
      totalTokens: run.totalTokens,
      estimatedCostUsd: run.estimatedCostUsd,
      latencyMs: run.latencyMs,
    },
    provider: run.provider,
    model: run.model,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  };
}

export function deriveTimeline(
  run: GenerationRunRecord,
  sections: SectionGenerationRecord[]
): WritingGenerationEvent[] {
  const events: WritingGenerationEvent[] = [
    {
      timestamp: run.createdAt.toISOString(),
      type: "RUN_CREATED",
      message: `Run ${run.id}`,
    },
  ];
  for (const sec of sections) {
    if (sec.startedAt) {
      events.push({
        timestamp: sec.startedAt.toISOString(),
        type: "SECTION_STARTED",
        sectionId: sec.sectionId,
        message: sec.sectionKey,
      });
    }
    if (sec.status === "GENERATED" && sec.completedAt) {
      events.push({
        timestamp: sec.completedAt.toISOString(),
        type: "SECTION_COMPLETED",
        sectionId: sec.sectionId,
        message: "ok",
      });
    }
    if (["FAILED", "VALIDATION_FAILED", "QA_FAILED"].includes(sec.status) && sec.completedAt) {
      events.push({
        timestamp: sec.completedAt.toISOString(),
        type: "SECTION_FAILED",
        sectionId: sec.sectionId,
        message: sec.errorMessage ?? sec.status,
      });
    }
  }
  if (run.completedAt) {
    events.push({
      timestamp: run.completedAt.toISOString(),
      type: run.status === "CANCELLED" ? "RUN_CANCELLED" : "RUN_COMPLETED",
      message: run.status,
    });
  }
  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
