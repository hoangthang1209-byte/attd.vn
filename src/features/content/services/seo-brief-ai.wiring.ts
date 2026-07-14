import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getSeoBriefAiConfig,
  isSeoBriefAiConfigured,
} from "@/features/ai/ai-seo-brief-config";
import { FakeStructuredProvider } from "@/features/ai/providers/fake-structured-provider";
import { createOpenAiStructuredProvider } from "@/features/ai/providers/openai-structured-provider";
import type { AiProvider } from "@/features/ai/providers/ai-provider";
import { retrieveContextForSeoBrief } from "@/features/ai-retrieval/ai-retrieval-contracts";
import { getSeoTopicById } from "@/features/content/services/seo-topic.service";
import { getSeoContentBrief } from "@/features/content/services/seo-brief.service";
import {
  generateSeoBriefSuggestion,
  type AiGenerationRunRecord,
  type SeoBriefGenerationRunStore,
  type SeoBriefGeneratorDeps,
} from "@/features/content/services/seo-brief-generator.service";
import type { SeoBriefApplyStore, SeoContentBriefRecord } from "@/features/content/services/seo-brief-apply.service";

export function createSeoBriefAiProvider(): AiProvider {
  const config = getSeoBriefAiConfig();
  if (config.provider === "fake") {
    return new FakeStructuredProvider();
  }
  return createOpenAiStructuredProvider();
}

export function createPrismaSeoBriefRunStore(): SeoBriefGenerationRunStore {
  return {
    async findRunning(topicId) {
      return prisma.aiGenerationRun.findFirst({
        where: {
          type: "SEO_BRIEF",
          entityType: "SEO_TOPIC",
          entityId: topicId,
          status: "RUNNING",
        },
        orderBy: { createdAt: "desc" },
      }) as Promise<AiGenerationRunRecord | null>;
    },
    async findCompletedByInputHash(topicId, inputHash) {
      return prisma.aiGenerationRun.findFirst({
        where: {
          type: "SEO_BRIEF",
          entityType: "SEO_TOPIC",
          entityId: topicId,
          status: "COMPLETED",
          inputHash,
        },
        orderBy: { completedAt: "desc" },
      }) as Promise<AiGenerationRunRecord | null>;
    },
    async createRunning(data) {
      return prisma.aiGenerationRun.create({
        data: {
          type: "SEO_BRIEF",
          status: "RUNNING",
          provider: data.provider,
          model: data.model,
          promptVersion: data.promptVersion,
          entityType: "SEO_TOPIC",
          entityId: data.entityId,
          retrievalRequestId: data.retrievalRequestId,
          inputHash: data.inputHash,
          inputSummary: data.inputSummary as Prisma.InputJsonValue,
          requestedBy: data.requestedBy,
          startedAt: new Date(),
        },
      }) as Promise<AiGenerationRunRecord>;
    },
    async markCompleted(id, data) {
      return prisma.aiGenerationRun.update({
        where: { id },
        data: {
          status: "COMPLETED",
          output: data.output as Prisma.InputJsonValue,
          warnings: data.warnings as Prisma.InputJsonValue,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          totalTokens: data.totalTokens,
          estimatedCostUsd: data.estimatedCostUsd,
          completedAt: new Date(),
          errorMessage: null,
        },
      }) as Promise<AiGenerationRunRecord>;
    },
    async markFailed(id, errorMessage) {
      return prisma.aiGenerationRun.update({
        where: { id },
        data: {
          status: "FAILED",
          errorMessage,
          completedAt: new Date(),
        },
      }) as Promise<AiGenerationRunRecord>;
    },
  };
}

export function createPrismaSeoBriefApplyStore(): SeoBriefApplyStore {
  return {
    async getRun(runId) {
      return prisma.aiGenerationRun.findUnique({ where: { id: runId } }) as Promise<AiGenerationRunRecord | null>;
    },
    async getBrief(topicId) {
      return prisma.seoContentBrief.findUnique({ where: { topicId } }) as Promise<SeoContentBriefRecord | null>;
    },
    async upsertBrief(topicId, data) {
      const existing = await prisma.seoContentBrief.findUnique({ where: { topicId } });
      const createData = {
        topicId,
        workingTitle: (data.workingTitle as string | null | undefined) ?? null,
        proposedSlug: (data.proposedSlug as string | null | undefined) ?? null,
        metaTitle: (data.metaTitle as string | null | undefined) ?? null,
        metaDescription: (data.metaDescription as string | null | undefined) ?? null,
        searchIntentNotes: (data.searchIntentNotes as string | null | undefined) ?? null,
        audienceNotes: (data.audienceNotes as string | null | undefined) ?? null,
        valueProposition: (data.valueProposition as string | null | undefined) ?? null,
        outline: (data.outline ?? []) as Prisma.InputJsonValue,
        questions: (data.questions ?? []) as Prisma.InputJsonValue,
        entities: (data.entities as string[] | undefined) ?? [],
        requiredSections: (data.requiredSections as string[] | undefined) ?? [],
        ctaType: (data.ctaType as string | null | undefined) ?? null,
        ctaText: (data.ctaText as string | null | undefined) ?? null,
        wordCountMin: (data.wordCountMin as number | null | undefined) ?? null,
        wordCountMax: (data.wordCountMax as number | null | undefined) ?? null,
        schemaTypes: (data.schemaTypes as string[] | undefined) ?? [],
        mediaRequirements:
          data.mediaRequirements === undefined
            ? undefined
            : (data.mediaRequirements as Prisma.InputJsonValue),
        editorNotes: (data.editorNotes as string | null | undefined) ?? null,
        approvedAt: null,
        approvedBy: null,
        lastAppliedGenerationRunId:
          (data.lastAppliedGenerationRunId as string | null | undefined) ?? null,
        version: 1,
      };

      const updateData: Prisma.SeoContentBriefUpdateInput = {
        approvedAt: null,
        approvedBy: null,
        lastAppliedGenerationRunId:
          (data.lastAppliedGenerationRunId as string | null | undefined) ?? null,
      };

      const assign = <K extends keyof Prisma.SeoContentBriefUpdateInput>(
        key: K,
        value: Prisma.SeoContentBriefUpdateInput[K],
      ) => {
        if (value !== undefined) updateData[key] = value;
      };

      if ("workingTitle" in data) assign("workingTitle", data.workingTitle as string | null);
      if ("proposedSlug" in data) assign("proposedSlug", data.proposedSlug as string | null);
      if ("metaTitle" in data) assign("metaTitle", data.metaTitle as string | null);
      if ("metaDescription" in data) {
        assign("metaDescription", data.metaDescription as string | null);
      }
      if ("searchIntentNotes" in data) {
        assign("searchIntentNotes", data.searchIntentNotes as string | null);
      }
      if ("audienceNotes" in data) assign("audienceNotes", data.audienceNotes as string | null);
      if ("valueProposition" in data) {
        assign("valueProposition", data.valueProposition as string | null);
      }
      if ("outline" in data) {
        assign("outline", data.outline as Prisma.InputJsonValue);
        if (existing?.approvedAt) {
          updateData.version = (existing.version ?? 1) + 1;
        }
      }
      if ("questions" in data) assign("questions", data.questions as Prisma.InputJsonValue);
      if ("entities" in data) assign("entities", data.entities as string[]);
      if ("requiredSections" in data) {
        assign("requiredSections", data.requiredSections as string[]);
      }
      if ("ctaType" in data) assign("ctaType", data.ctaType as string | null);
      if ("ctaText" in data) assign("ctaText", data.ctaText as string | null);
      if ("wordCountMin" in data) assign("wordCountMin", data.wordCountMin as number | null);
      if ("wordCountMax" in data) assign("wordCountMax", data.wordCountMax as number | null);
      if ("schemaTypes" in data) assign("schemaTypes", data.schemaTypes as string[]);
      if ("mediaRequirements" in data) {
        assign("mediaRequirements", data.mediaRequirements as Prisma.InputJsonValue);
      }
      if ("editorNotes" in data) assign("editorNotes", data.editorNotes as string | null);

      return prisma.seoContentBrief.upsert({
        where: { topicId },
        create: createData,
        update: updateData,
      }) as Promise<SeoContentBriefRecord>;
    },
  };
}

export function createDefaultSeoBriefGeneratorDeps(
  overrides?: Partial<SeoBriefGeneratorDeps>,
): SeoBriefGeneratorDeps {
  const config = overrides?.config ?? getSeoBriefAiConfig();
  return {
    getTopicById: overrides?.getTopicById ?? getSeoTopicById,
    getExistingBrief:
      overrides?.getExistingBrief ??
      (async (topicId) => getSeoContentBrief(topicId)),
    retrieveContext: overrides?.retrieveContext ?? retrieveContextForSeoBrief,
    provider: overrides?.provider ?? createSeoBriefAiProvider(),
    config,
    runs: overrides?.runs ?? createPrismaSeoBriefRunStore(),
  };
}

export async function generateSeoBriefSuggestionForTopic(input: {
  topicId: string;
  regenerate?: boolean;
  requestedBy?: string | null;
  userId?: string | null;
}) {
  if (!isSeoBriefAiConfigured()) {
    // Still allow generateSeoBriefSuggestion to throw structured error
  }
  return generateSeoBriefSuggestion(
    {
      topicId: input.topicId,
      regenerate: input.regenerate,
      requestedBy: input.requestedBy ?? null,
      userId: input.userId ?? null,
    },
    createDefaultSeoBriefGeneratorDeps(),
  );
}

export function toSafeGenerationRunMetadata(run: AiGenerationRunRecord) {
  return {
    id: run.id,
    type: run.type,
    status: run.status,
    provider: run.provider,
    model: run.model,
    promptVersion: run.promptVersion,
    entityType: run.entityType,
    entityId: run.entityId,
    retrievalRequestId: run.retrievalRequestId,
    inputHash: run.inputHash,
    inputSummary: run.inputSummary,
    warnings: run.warnings,
    errorMessage: run.errorMessage,
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    totalTokens: run.totalTokens,
    estimatedCostUsd:
      run.estimatedCostUsd == null ? null : Number(run.estimatedCostUsd),
    requestedBy: run.requestedBy,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    hasOutput: Boolean(run.output),
  };
}

export function toSafeGenerationRunDetail(run: AiGenerationRunRecord) {
  return {
    ...toSafeGenerationRunMetadata(run),
    output: run.output,
  };
}
