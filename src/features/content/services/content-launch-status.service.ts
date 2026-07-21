import "server-only";

import { prisma } from "@/lib/prisma";
import { getWritingGenerationConfig } from "@/features/writing-engine/writing-generation-config";
import { getKnowledgeGraphExpansionFlagSnapshot } from "@/features/knowledge-graph/evaluation/graph-expansion-flags";
import type { ContentLaunchStatus } from "@/features/content/launch/content-launch.types";
import { inspectPoloLaunchMediaBundle } from "@/features/content/services/content-launch-media.service";
import {
  buildAiGenerationLaunchBlock,
  buildGraphLaunchBlock,
  buildPublishingLaunchBlock,
  resolveLaunchReadinessFlags,
} from "@/features/content/launch/content-launch-status.rules";

const CRON_ROUTE = "/api/internal/content/publish-due";
const CRON_SCHEDULE = "0 17 * * *";

function cronSecretConfigured(): boolean {
  return Boolean(
    process.env.CONTENT_PUBLISH_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim(),
  );
}

async function countPublicApprovedKnowledge(): Promise<{
  publicApprovedFacts: number;
  retrievalReadyFacts: number;
  blockingConflicts: number;
  warnings: string[];
}> {
  const warnings: string[] = [];

  const [publicApprovedFacts, retrievalReadyFacts, confidentialCount, blockingConflicts] =
    await Promise.all([
      prisma.knowledgeBaseEntry.count({
        where: {
          status: "ACTIVE",
          visibility: "PUBLIC",
          approvedAt: { not: null },
        },
      }),
      prisma.knowledgeBaseEntry.count({
        where: {
          status: "ACTIVE",
          visibility: { in: ["PUBLIC", "INTERNAL"] },
          OR: [{ approvedAt: { not: null } }, { isVerified: true }],
        },
      }),
      prisma.knowledgeBaseEntry.count({
        where: { status: "ACTIVE", visibility: "CONFIDENTIAL" },
      }),
      prisma.knowledgeBaseEntry.count({
        where: {
          status: "ACTIVE",
          claimStatus: "NEEDS_EVIDENCE",
          visibility: "PUBLIC",
        },
      }),
    ]);

  if (publicApprovedFacts === 0) {
    warnings.push("Chưa có fact PUBLIC đã duyệt — bài viết không được bịa số liệu.");
  }
  if (confidentialCount > 0 && publicApprovedFacts === 0) {
    warnings.push("Có entry confidential nhưng chưa có entry public usable.");
  }

  return {
    publicApprovedFacts,
    retrievalReadyFacts,
    blockingConflicts,
    warnings,
  };
}

async function lastSuccessfulDueRunAt(): Promise<string | null> {
  const event = await prisma.contentPublishEvent.findFirst({
    where: {
      status: "COMPLETED",
      requestedBy: { contains: "publish-due" },
    },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true, createdAt: true },
  });

  if (!event) {
    const fallback = await prisma.contentPublishEvent.findFirst({
      where: {
        status: "COMPLETED",
        requestedBy: { contains: "cron" },
      },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true, createdAt: true },
    });
    return (fallback?.completedAt ?? fallback?.createdAt)?.toISOString() ?? null;
  }

  return (event.completedAt ?? event.createdAt).toISOString();
}

export async function getContentLaunchStatus(): Promise<ContentLaunchStatus> {
  const writing = getWritingGenerationConfig();
  const graph = getKnowledgeGraphExpansionFlagSnapshot();
  const secretOk = cronSecretConfigured();

  const aiGeneration = buildAiGenerationLaunchBlock({
    enabled: writing.enabled,
    provider: writing.provider,
    model: writing.model,
    apiKeyConfigured: writing.apiKeyConfigured,
    maxOutputTokensPerSection: writing.maxOutputTokensPerSection,
    dailyRunLimit: writing.dailyRunLimit,
    monthlyBudgetUsd: writing.monthlyBudgetUsd,
    maxSectionsPerRun: writing.maxSectionsPerRun,
  });

  const [knowledge, media, lastDue] = await Promise.all([
    countPublicApprovedKnowledge(),
    inspectPoloLaunchMediaBundle(),
    lastSuccessfulDueRunAt().catch(() => null),
  ]);

  const publishing = buildPublishingLaunchBlock({
    cronSecretConfigured: secretOk,
    cronSchedule: CRON_SCHEDULE,
    lastSuccessfulDueRunAt: lastDue,
  });

  const readiness = resolveLaunchReadinessFlags({ ai: aiGeneration, publishing });

  return {
    aiGeneration,
    publishing,
    knowledge: {
      publicApprovedFacts: knowledge.publicApprovedFacts,
      retrievalReadyFacts: knowledge.retrievalReadyFacts,
      blockingConflicts: knowledge.blockingConflicts,
      warnings: knowledge.warnings,
    },
    media: {
      poloBundleId: media.bundleId,
      poloBundleStatus: media.bundleStatus,
      publicAssetCount: media.publicAssetCount,
      requiredSlotsFilled: media.requiredSlotsFilled,
      requiredSlotsTotal: media.requiredSlotsTotal,
      warnings: media.warnings,
    },
    graph: buildGraphLaunchBlock(graph),
    ...readiness,
  };
}

export function getContentLaunchCronRoutePath(): string {
  return CRON_ROUTE;
}
