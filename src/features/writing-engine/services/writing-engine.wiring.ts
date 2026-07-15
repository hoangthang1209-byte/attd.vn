import type { Prisma } from "@prisma/client";
import type { WritingPlan, WritingStructuredDraft } from "@/features/writing-engine/writing-engine.types";
import { renderWritingDraftHtml } from "@/features/writing-engine/renderers/html-renderer";
import { renderWritingDraftMarkdown } from "@/features/writing-engine/renderers/markdown-renderer";
import { renderWritingDraftPlainText } from "@/features/writing-engine/renderers/plain-text-renderer";

export type WritingPlanRecord = {
  id: string;
  contextBuildId: string;
  topicId: string;
  briefId: string | null;
  contentType: string;
  status: string;
  version: string;
  inputHash: string;
  planHash: string | null;
  planJson: unknown;
  readinessScore: number | null;
  readinessErrors: unknown;
  readinessWarnings: unknown;
  requestedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WritingDraftRecord = {
  id: string;
  writingPlanId: string;
  status: string;
  structuredDraft: unknown;
  renderedHtml: string | null;
  renderedMarkdown: string | null;
  qaReport: unknown;
  providerRunIds: string[];
  version: number;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WritingPlanStore = {
  findByInputHash(inputHash: string, contentType: string): Promise<WritingPlanRecord | null>;
  findById(id: string): Promise<WritingPlanRecord | null>;
  listByTopic(topicId: string): Promise<WritingPlanRecord[]>;
  create(data: {
    contextBuildId: string;
    topicId: string;
    briefId?: string | null;
    contentType: string;
    status: string;
    version: string;
    inputHash: string;
    planHash: string;
    planJson: WritingPlan;
    readinessScore: number;
    readinessErrors: unknown;
    readinessWarnings: unknown;
    requestedBy?: string | null;
  }): Promise<WritingPlanRecord>;
  supersedeReadyPlans(topicId: string, contentType: string, exceptId: string): Promise<number>;
  updateStatus(id: string, status: string): Promise<WritingPlanRecord>;
};

export type WritingDraftStore = {
  findById(id: string): Promise<WritingDraftRecord | null>;
  listByPlan(writingPlanId: string): Promise<WritingDraftRecord[]>;
  create(data: {
    writingPlanId: string;
    status: string;
    structuredDraft: WritingStructuredDraft;
    createdBy?: string | null;
  }): Promise<WritingDraftRecord>;
  update(
    id: string,
    data: Partial<{
      status: string;
      structuredDraft: WritingStructuredDraft;
      renderedHtml: string | null;
      renderedMarkdown: string | null;
      qaReport: unknown;
    }>
  ): Promise<WritingDraftRecord>;
};

export function toSafeWritingPlanSummary(row: WritingPlanRecord) {
  const plan = row.planJson as WritingPlan | null;
  return {
    id: row.id,
    contextBuildId: row.contextBuildId,
    topicId: row.topicId,
    briefId: row.briefId,
    contentType: row.contentType,
    status: row.status,
    version: row.version,
    inputHash: row.inputHash,
    planHash: row.planHash,
    readinessScore: row.readinessScore,
    readiness: plan?.readiness ?? null,
    sectionCount: plan?.sections?.length ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toSafeWritingDraftSummary(row: WritingDraftRecord) {
  const draft = row.structuredDraft as WritingStructuredDraft | null;
  return {
    id: row.id,
    writingPlanId: row.writingPlanId,
    status: row.status,
    version: row.version,
    isMock: draft?.isMock ?? false,
    sectionCount: draft?.sections?.length ?? 0,
    qaPassed: (row.qaReport as { passed?: boolean } | null)?.passed ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function parsePlanJson(row: WritingPlanRecord): WritingPlan {
  const plan = row.planJson as WritingPlan | null;
  if (!plan || typeof plan !== "object") {
    throw new Error("Plan JSON missing");
  }
  return plan;
}

export function parseDraftJson(row: WritingDraftRecord): WritingStructuredDraft {
  const draft = row.structuredDraft as WritingStructuredDraft | null;
  if (!draft || typeof draft !== "object") {
    throw new Error("Draft JSON missing");
  }
  return draft;
}

export function renderDraftOutputs(draft: WritingStructuredDraft) {
  return {
    html: renderWritingDraftHtml(draft),
    markdown: renderWritingDraftMarkdown(draft),
    plainText: renderWritingDraftPlainText(draft),
  };
}

export type WritingPlanCreatePayload = Parameters<WritingPlanStore["create"]>[0];

export function planRecordToPrismaCreate(data: WritingPlanCreatePayload): Prisma.WritingPlanRecordCreateInput {
  return {
    contextBuildId: data.contextBuildId,
    topicId: data.topicId,
    briefId: data.briefId,
    contentType: data.contentType as never,
    status: data.status as never,
    version: data.version,
    inputHash: data.inputHash,
    planHash: data.planHash,
    planJson: data.planJson as Prisma.InputJsonValue,
    readinessScore: data.readinessScore,
    readinessErrors: data.readinessErrors as Prisma.InputJsonValue,
    readinessWarnings: data.readinessWarnings as Prisma.InputJsonValue,
    requestedBy: data.requestedBy,
  };
}
