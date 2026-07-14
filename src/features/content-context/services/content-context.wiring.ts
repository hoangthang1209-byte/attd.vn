import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { retrieveContextForContentWriting } from "@/features/ai-retrieval/ai-retrieval-contracts";
import { getSeoTopicById } from "@/features/content/services/seo-topic.service";
import { getSeoContentBrief } from "@/features/content/services/seo-brief.service";
import { getMediaBundleForContent } from "@/features/media/services/media-bundle.service";
import { listInternalLinksForTopic } from "@/features/content/services/seo-internal-link.service";
import {
  buildContentContextPackage,
  type BuildContentContextResult,
  type ContentContextBriefSnapshot,
  type ContentContextBuildRecord,
  type ContentContextBuildStore,
  type ContentContextBuilderDeps,
  type ContentContextBundleSnapshot,
  type ContentContextLinkSnapshot,
  type ContentContextTopicSnapshot,
} from "@/features/content-context/services/content-context-builder.service";
import type { BuildContentContextRequest } from "@/features/content-context/content-context.types";

export function createPrismaContentContextBuildStore(): ContentContextBuildStore {
  return {
    async findCompletedByInputHash(topicId, purpose, inputHash) {
      return prisma.contentContextBuild.findFirst({
        where: {
          topicId,
          purpose: purpose as never,
          inputHash,
          status: "COMPLETED",
        },
        orderBy: { completedAt: "desc" },
      }) as Promise<ContentContextBuildRecord | null>;
    },
    async createRunning(data) {
      return prisma.contentContextBuild.create({
        data: {
          topicId: data.topicId,
          briefId: data.briefId,
          purpose: data.purpose as never,
          status: "RUNNING",
          version: data.version,
          inputHash: data.inputHash,
          requestedBy: data.requestedBy,
          startedAt: new Date(),
        },
      }) as Promise<ContentContextBuildRecord>;
    },
    async markCompleted(id, data) {
      return prisma.contentContextBuild.update({
        where: { id },
        data: {
          status: "COMPLETED",
          retrievalRequestId: data.retrievalRequestId,
          packageHash: data.packageHash,
          readinessScore: data.readinessScore,
          readinessErrors: data.readinessErrors as Prisma.InputJsonValue,
          readinessWarnings: data.readinessWarnings as Prisma.InputJsonValue,
          sourceManifest: data.sourceManifest as Prisma.InputJsonValue,
          budgetSummary: data.budgetSummary as Prisma.InputJsonValue,
          packageJson: data.packageJson as Prisma.InputJsonValue,
          completedAt: new Date(),
          errorMessage: null,
        },
      }) as Promise<ContentContextBuildRecord>;
    },
    async markFailed(id, errorMessage) {
      return prisma.contentContextBuild.update({
        where: { id },
        data: {
          status: "FAILED",
          errorMessage,
          completedAt: new Date(),
        },
      }) as Promise<ContentContextBuildRecord>;
    },
    async supersedePreviousCompleted(topicId, purpose, exceptId) {
      const result = await prisma.contentContextBuild.updateMany({
        where: {
          topicId,
          purpose: purpose as never,
          status: "COMPLETED",
          id: { not: exceptId },
        },
        data: { status: "SUPERSEDED" },
      });
      return result.count;
    },
  };
}

async function mapTopic(topicId: string): Promise<ContentContextTopicSnapshot | null> {
  const topic = await getSeoTopicById(topicId);
  if (!topic) return null;
  const keywords = Array.isArray(topic.keywords)
    ? (topic.keywords as Array<{ keyword?: string; keywordType?: string }>).map((k) => ({
        keyword: k.keyword ?? "",
        keywordType: k.keywordType,
      }))
    : [];
  return {
    id: topic.id,
    title: topic.title,
    primaryKeyword: topic.primaryKeyword,
    searchIntent: topic.searchIntent,
    funnelStage: topic.funnelStage,
    contentType: topic.contentType,
    targetAudience: topic.targetAudience ?? [],
    strategyId: topic.strategyId,
    clusterId: topic.clusterId,
    mediaBundleId: topic.mediaBundleId,
    updatedAt: topic.updatedAt,
    keywords: keywords.filter((k) => k.keyword),
  };
}

async function mapBrief(topicId: string): Promise<ContentContextBriefSnapshot | null> {
  const brief = await getSeoContentBrief(topicId);
  if (!brief) return null;
  return {
    id: brief.id,
    workingTitle: brief.workingTitle,
    proposedSlug: brief.proposedSlug,
    metaTitle: brief.metaTitle,
    metaDescription: brief.metaDescription,
    audienceNotes: brief.audienceNotes,
    valueProposition: brief.valueProposition,
    outline: brief.outline,
    questions: brief.questions,
    entities: brief.entities,
    requiredSections: brief.requiredSections,
    ctaType: brief.ctaType,
    ctaText: brief.ctaText,
    wordCountMin: brief.wordCountMin,
    wordCountMax: brief.wordCountMax,
    schemaTypes: brief.schemaTypes,
    version: brief.version,
    approvedAt: brief.approvedAt,
    updatedAt: brief.updatedAt.toISOString(),
  };
}

async function mapBundle(bundleId: string): Promise<ContentContextBundleSnapshot> {
  const bundle = await getMediaBundleForContent(bundleId);
  if (!bundle) return null;
  return {
    id: bundle.id,
    name: bundle.name,
    contentType: bundle.contentType,
    status: bundle.status,
    updatedAt: bundle.updatedAt,
    slots: bundle.slots.map((slot) => ({
      slotType: slot.slotType,
      label: slot.label,
      required: slot.required,
      minAssets: slot.minAssets,
      assets: slot.assets.map((asset) => ({
        id: asset.id,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl ?? null,
        title: asset.title ?? null,
        altText: asset.altText ?? null,
        caption: null,
        orientation: asset.orientation ?? null,
        seoScore: asset.seoScore ?? null,
        library: asset.library ?? null,
        role: asset.role ?? null,
        contentSuitabilities: asset.contentSuitabilities ?? [],
        visibility: asset.visibility,
        sortOrder: asset.sortOrder,
      })),
    })),
  };
}

async function mapLinks(topicId: string): Promise<ContentContextLinkSnapshot[]> {
  const { from } = await listInternalLinksForTopic(topicId);
  return from.map((row) => ({
    id: row.id,
    status: row.status,
    anchorText: row.anchorText,
    context: row.context,
    relevanceScore: row.relevanceScore,
    targetTopicId: row.targetTopicId,
    targetTitle: row.targetTopic.title,
    targetUrl: row.targetTopic.targetUrl,
    targetStatus: row.targetTopic.status,
  }));
}

export function createDefaultContentContextBuilderDeps(
  overrides?: Partial<ContentContextBuilderDeps>,
): ContentContextBuilderDeps {
  return {
    getTopic: overrides?.getTopic ?? mapTopic,
    getBrief: overrides?.getBrief ?? mapBrief,
    retrieveContext:
      overrides?.retrieveContext ??
      (async ({ topicId, profile, userId, maxItems, maxContextCharacters }) =>
        retrieveContextForContentWriting(topicId, {
          userId,
          maxItems,
          maxContextCharacters,
          sourceTypes: profile.allowedSourceTypes,
        })),
    getMediaBundle: overrides?.getMediaBundle ?? mapBundle,
    listInternalLinks: overrides?.listInternalLinks ?? mapLinks,
    builds: overrides?.builds ?? createPrismaContentContextBuildStore(),
  };
}

export async function buildContentContextForTopic(
  request: BuildContentContextRequest,
  opts?: { requestedBy?: string | null; userId?: string | null },
): Promise<BuildContentContextResult> {
  return buildContentContextPackage(
    request,
    createDefaultContentContextBuilderDeps(),
    opts,
  );
}

export function toSafeContentContextBuildSummary(row: ContentContextBuildRecord) {
  return {
    id: row.id,
    topicId: row.topicId,
    briefId: row.briefId,
    purpose: row.purpose,
    status: row.status,
    version: row.version,
    retrievalRequestId: row.retrievalRequestId,
    inputHash: row.inputHash,
    packageHash: row.packageHash,
    readinessScore: row.readinessScore,
    readinessErrors: row.readinessErrors,
    readinessWarnings: row.readinessWarnings,
    budgetSummary: row.budgetSummary,
    errorMessage: row.errorMessage,
    requestedBy: row.requestedBy,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    hasPackage: Boolean(row.packageJson),
  };
}
