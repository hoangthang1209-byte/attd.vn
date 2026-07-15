import "server-only";

import { prisma } from "@/lib/prisma";
import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import { getContextPackageForWriter } from "@/features/content-context/services/content-writer-guard.service";
import {
  buildWritingPlanFromPackage,
  derivePlanStatus,
  diffWritingPlans,
  hashWritingPlanInput,
} from "@/features/writing-engine/services/writing-plan-builder.service";
import { validateSectionDraft } from "@/features/writing-engine/services/writing-section-validator.service";
import { runWritingQa } from "@/features/writing-engine/qa/writing-qa.service";
import {
  emptySectionDraft,
  generateMockDraftSections,
  isWritingMockEnabled,
  stableDraftId,
} from "@/features/writing-engine/services/writing-mock-generator.service";
import {
  parseDraftJson,
  parsePlanJson,
  renderDraftOutputs,
  type WritingDraftStore,
  type WritingPlanStore,
} from "@/features/writing-engine/services/writing-engine.wiring";
import {
  WRITING_ENGINE_VERSION,
  type BuildWritingPlanRequest,
  type WritingDraftStatus,
  type WritingPlan,
  type WritingPlanStatus,
  type WritingSectionDraft,
  type WritingStructuredDraft,
} from "@/features/writing-engine/writing-engine.types";
import { stableId } from "@/features/writing-engine/writing-utils";

export class WritingEngineError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "WritingEngineError";
    this.code = code;
    this.status = status;
  }
}

export type WritingEngineDeps = {
  plans: WritingPlanStore;
  drafts: WritingDraftStore;
  getWriterPackage: typeof getContextPackageForWriter;
};

export function createPrismaWritingPlanStore(): WritingPlanStore {
  return {
    async findByInputHash(inputHash, contentType) {
      return prisma.writingPlanRecord.findFirst({
        where: { inputHash, contentType: contentType as never, status: { in: ["READY", "DRAFT"] } },
        orderBy: { createdAt: "desc" },
      });
    },
    async findById(id) {
      return prisma.writingPlanRecord.findUnique({ where: { id } });
    },
    async listByTopic(topicId) {
      return prisma.writingPlanRecord.findMany({
        where: { topicId },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
    },
    async create(data) {
      return prisma.writingPlanRecord.create({
        data: {
          contextBuildId: data.contextBuildId,
          topicId: data.topicId,
          briefId: data.briefId,
          contentType: data.contentType as never,
          status: data.status as never,
          version: data.version,
          inputHash: data.inputHash,
          planHash: data.planHash,
          planJson: data.planJson as never,
          readinessScore: data.readinessScore,
          readinessErrors: data.readinessErrors as never,
          readinessWarnings: data.readinessWarnings as never,
          requestedBy: data.requestedBy,
        },
      });
    },
    async supersedeReadyPlans(topicId, contentType, exceptId) {
      const result = await prisma.writingPlanRecord.updateMany({
        where: {
          topicId,
          contentType: contentType as never,
          status: "READY",
          id: { not: exceptId },
        },
        data: { status: "SUPERSEDED" },
      });
      return result.count;
    },
    async updateStatus(id, status) {
      return prisma.writingPlanRecord.update({
        where: { id },
        data: { status: status as never },
      });
    },
  };
}

export function createPrismaWritingDraftStore(): WritingDraftStore {
  return {
    async findById(id) {
      return prisma.writingDraftRecord.findUnique({ where: { id } });
    },
    async listByPlan(writingPlanId) {
      return prisma.writingDraftRecord.findMany({
        where: { writingPlanId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    },
    async create(data) {
      return prisma.writingDraftRecord.create({
        data: {
          writingPlanId: data.writingPlanId,
          status: data.status as never,
          structuredDraft: data.structuredDraft as never,
          createdBy: data.createdBy,
        },
      });
    },
    async update(id, data) {
      return prisma.writingDraftRecord.update({
        where: { id },
        data: {
          status: data.status as never,
          structuredDraft: data.structuredDraft as never,
          renderedHtml: data.renderedHtml,
          renderedMarkdown: data.renderedMarkdown,
          qaReport: data.qaReport as never,
        },
      });
    },
  };
}

const defaultDeps = (): WritingEngineDeps => ({
  plans: createPrismaWritingPlanStore(),
  drafts: createPrismaWritingDraftStore(),
  getWriterPackage: getContextPackageForWriter,
});

export async function buildWritingPlan(
  request: BuildWritingPlanRequest & { requestedBy?: string | null },
  deps: WritingEngineDeps = defaultDeps()
) {
  const buildRow = await prisma.contentContextBuild.findUnique({
    where: { id: request.contextBuildId },
  });
  if (!buildRow) {
    throw new WritingEngineError("Context build not found", "BUILD_NOT_FOUND", 404);
  }
  const buildPkg = buildRow.packageJson as ContentContextPackage | null;
  const approvedBriefVersion = Number(
    buildPkg?.entity?.briefVersion ?? buildPkg?.brief?.version ?? 0
  );

  const pkg = await deps.getWriterPackage({
    contextBuildId: request.contextBuildId,
    approvedBriefVersion,
    outputFormat: "STRUCTURED",
  });

  if (pkg.entity.topicId !== request.topicId) {
    throw new WritingEngineError("Topic mismatch", "TOPIC_MISMATCH", 400);
  }

  const briefVersion = pkg.entity.briefVersion ?? pkg.brief.version ?? null;
  const inputHash = hashWritingPlanInput({
    packageHash: pkg.packageHash,
    briefVersion: briefVersion != null ? Number(briefVersion) : null,
    contentType: request.contentType,
  });

  if (!request.forceRebuild) {
    const cached = await deps.plans.findByInputHash(inputHash, request.contentType);
    if (cached) {
      const plan = parsePlanJson(cached);
      return {
        plan,
        status: cached.status as WritingPlanStatus,
        cacheHint: true,
        diff: null,
      };
    }
  }

  const built = buildWritingPlanFromPackage(pkg, request);
  const status = derivePlanStatus(built);

  const previous = (await deps.plans.listByTopic(request.topicId)).find(
    (r) => r.contentType === request.contentType && r.status === "READY"
  );
  const diff = diffWritingPlans(previous ? parsePlanJson(previous) : null, built);

  const row = await deps.plans.create({
    contextBuildId: request.contextBuildId,
    topicId: request.topicId,
    briefId: built.briefId ?? null,
    contentType: request.contentType,
    status,
    version: WRITING_ENGINE_VERSION,
    inputHash,
    planHash: built.planHash,
    planJson: built,
    readinessScore: built.readiness.score,
    readinessErrors: built.readiness.errors,
    readinessWarnings: built.readiness.warnings,
    requestedBy: request.requestedBy ?? null,
  });

  if (status === "READY") {
    await deps.plans.supersedeReadyPlans(request.topicId, request.contentType, row.id);
  }

  return {
    plan: { ...built, id: row.id },
    status,
    cacheHint: false,
    diff,
  };
}

export async function getWritingPlan(planId: string, deps: WritingEngineDeps = defaultDeps()) {
  const row = await deps.plans.findById(planId);
  if (!row) throw new WritingEngineError("Plan not found", "PLAN_NOT_FOUND", 404);
  return { plan: parsePlanJson(row), record: row };
}

export async function listWritingPlans(topicId: string, deps: WritingEngineDeps = defaultDeps()) {
  return deps.plans.listByTopic(topicId);
}

export async function createEmptyDraftFromPlan(
  planId: string,
  createdBy?: string | null,
  deps: WritingEngineDeps = defaultDeps()
) {
  const { plan, record } = await getWritingPlan(planId, deps);
  if (!plan.readiness.ready) {
    throw new WritingEngineError("Plan not ready", "PLAN_NOT_READY", 422);
  }

  const now = new Date().toISOString();
  const structured: WritingStructuredDraft = {
    id: stableDraftId(planId),
    planId,
    contentType: plan.contentType,
    language: plan.language,
    title: plan.titlePlan.h1,
    slug: plan.metadataPlan.slug,
    metaTitle: plan.metadataPlan.metaTitle,
    metaDescription: plan.metadataPlan.metaDescription,
    sections: plan.sections.map((s) => emptySectionDraft(s.id, s.heading)),
    faq: [],
    cta: plan.ctaPlan,
    media: plan.mediaPlan.placements,
    internalLinks: plan.internalLinkPlan.placements,
    schemaPlan: plan.schemaPlan,
    qa: {
      passed: false,
      score: 0,
      issues: [],
      metrics: {
        totalWords: 0,
        sectionCount: plan.sections.length,
        requiredFactCoverage: 0,
        usedFactCount: 0,
        unsupportedClaimCount: 0,
        internalLinkCount: 0,
        mediaCount: 0,
        missingAltCount: 0,
        headingErrors: 0,
        keywordWarnings: 0,
      },
    },
    rendered: {},
    status: "PLANNED",
    isMock: false,
    createdAt: now,
    updatedAt: now,
  };

  const draftRow = await deps.drafts.create({
    writingPlanId: planId,
    status: "PLANNED",
    structuredDraft: structured,
    createdBy,
  });

  void record;
  return { draft: { ...structured, id: draftRow.id }, record: draftRow };
}

export function validateSectionDraftForPlan(plan: WritingPlan, draft: WritingSectionDraft) {
  return validateSectionDraft(plan, draft);
}

export function assembleStructuredDraft(
  plan: WritingPlan,
  sections: WritingSectionDraft[],
  draftId: string,
  isMock = false
): WritingStructuredDraft {
  const now = new Date().toISOString();
  return {
    id: draftId,
    planId: plan.id,
    contentType: plan.contentType,
    language: plan.language,
    title: plan.titlePlan.h1,
    slug: plan.metadataPlan.slug,
    metaTitle: plan.metadataPlan.metaTitle,
    metaDescription: plan.metadataPlan.metaDescription,
    sections,
    faq: [],
    cta: plan.ctaPlan,
    media: plan.mediaPlan.placements,
    internalLinks: plan.internalLinkPlan.placements,
    schemaPlan: plan.schemaPlan,
    qa: {
      passed: false,
      score: 0,
      issues: [],
      metrics: {
        totalWords: sections.reduce((n, s) => n + s.wordCount, 0),
        sectionCount: sections.length,
        requiredFactCoverage: 0,
        usedFactCount: new Set(sections.flatMap((s) => s.factIdsUsed)).size,
        unsupportedClaimCount: 0,
        internalLinkCount: sections.reduce((n, s) => n + s.internalLinkIdsUsed.length, 0),
        mediaCount: sections.reduce((n, s) => n + s.mediaPlacementIdsUsed.length, 0),
        missingAltCount: 0,
        headingErrors: 0,
        keywordWarnings: 0,
      },
    },
    rendered: {},
    status: isMock ? "GENERATED" : "GENERATED",
    isMock,
    createdAt: now,
    updatedAt: now,
  };
}

export async function runWritingQaForDraft(draftId: string, deps: WritingEngineDeps = defaultDeps()) {
  const draftRow = await deps.drafts.findById(draftId);
  if (!draftRow) throw new WritingEngineError("Draft not found", "DRAFT_NOT_FOUND", 404);
  const draft = parseDraftJson(draftRow);
  const { plan } = await getWritingPlan(draft.planId, deps);
  const qa = runWritingQa(plan, draft);
  const status: WritingDraftStatus = qa.passed ? "REVIEW_READY" : "QA_FAILED";
  const updatedDraft = { ...draft, qa, status, updatedAt: new Date().toISOString() };
  const row = await deps.drafts.update(draftId, {
    status,
    structuredDraft: updatedDraft,
    qaReport: qa,
  });
  return { qa, draft: updatedDraft, record: row };
}

export async function renderWritingDraft(draftId: string, deps: WritingEngineDeps = defaultDeps()) {
  const draftRow = await deps.drafts.findById(draftId);
  if (!draftRow) throw new WritingEngineError("Draft not found", "DRAFT_NOT_FOUND", 404);
  const draft = parseDraftJson(draftRow);
  const rendered = renderDraftOutputs(draft);
  const updatedDraft = {
    ...draft,
    rendered,
    updatedAt: new Date().toISOString(),
  };
  const row = await deps.drafts.update(draftId, {
    structuredDraft: updatedDraft,
    renderedHtml: rendered.html,
    renderedMarkdown: rendered.markdown,
  });
  return { rendered, draft: updatedDraft, record: row };
}

export async function getWritingDraft(draftId: string, deps: WritingEngineDeps = defaultDeps()) {
  const row = await deps.drafts.findById(draftId);
  if (!row) throw new WritingEngineError("Draft not found", "DRAFT_NOT_FOUND", 404);
  return { draft: parseDraftJson(row), record: row };
}

export async function listWritingDrafts(planId: string, deps: WritingEngineDeps = defaultDeps()) {
  return deps.drafts.listByPlan(planId);
}

export async function mockGenerateDraftSections(draftId: string, deps: WritingEngineDeps = defaultDeps()) {
  if (!isWritingMockEnabled()) {
    throw new WritingEngineError("Mock generation disabled", "MOCK_DISABLED", 403);
  }
  const { draft, record: draftRow } = await getWritingDraft(draftId, deps);
  const { plan } = await getWritingPlan(draft.planId, deps);
  const sections = generateMockDraftSections(plan);
  const assembled = assembleStructuredDraft(plan, sections, draftId, true);
  const qa = runWritingQa(plan, assembled);
  assembled.qa = qa;
  assembled.status = qa.passed ? "REVIEW_READY" : "QA_FAILED";
  const row = await deps.drafts.update(draftId, {
    status: assembled.status,
    structuredDraft: assembled,
    qaReport: qa,
  });
  void draftRow;
  void draft;
  return { draft: assembled, record: row };
}

export { isWritingMockEnabled };
