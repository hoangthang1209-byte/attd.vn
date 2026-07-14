import { prisma } from "@/lib/prisma";
import { retrieveKnowledgeForAi } from "@/features/knowledge-base/knowledge-base-retrieval.service";
import { getEntrySourceInfo } from "@/features/knowledge-base/knowledge-base-source-utils";
import { getLatestApprovedKnowledgeVersion } from "@/features/knowledge-base/knowledge-base-version.service";
import type { KnowledgeBaseEntryRecord } from "@/features/knowledge-base/knowledge-base-types";
import type { KnowledgeVisibilityAudience } from "@/features/knowledge-base/knowledge-base-visibility";
import type {
  AiRetrievedFact,
  AiRetrievalOmittedBucket,
  AiRetrievalPolicy,
  AiRetrievalRequest,
  KnowledgeVisibility,
} from "@/features/ai-retrieval/ai-retrieval-types";
import { getAuthorityRank } from "@/features/ai-retrieval/ai-authority";
import { calculateKnowledgeStaleness } from "@/features/ai-retrieval/ai-retrieval-staleness";
import { resolveEffectiveMaxVisibility } from "@/features/ai-retrieval/ai-retrieval-policy";

function visibilityToAudience(maxVisibility: KnowledgeVisibility): KnowledgeVisibilityAudience {
  if (maxVisibility === "PUBLIC") return "PUBLIC_AI";
  if (maxVisibility === "CONFIDENTIAL") return "ADMIN";
  return "INTERNAL_AI";
}

function confidenceToNumber(value: string): number {
  if (value === "HIGH") return 0.9;
  if (value === "LOW") return 0.4;
  return 0.65;
}

export async function retrieveKnowledgeFacts(
  request: AiRetrievalRequest,
  policy: AiRetrievalPolicy
): Promise<{ facts: AiRetrievedFact[]; omitted: AiRetrievalOmittedBucket[]; warnings: string[] }> {
  const omittedMap = new Map<string, number>();
  const bump = (reason: string) => omittedMap.set(reason, (omittedMap.get(reason) ?? 0) + 1);
  const warnings: string[] = [];

  const maxVisibility = resolveEffectiveMaxVisibility(policy, request.purpose);
  const audience = visibilityToAudience(maxVisibility);
  const limit = Math.min(request.maxItems ?? policy.maxItems, 40);

  const rows = await prisma.knowledgeBaseEntry.findMany({
    where: {
      status: { in: ["ACTIVE", "DRAFT"] },
      ...(request.knowledgeEntryIds?.length ? { id: { in: request.knowledgeEntryIds } } : {}),
      ...(request.domains?.length ? { domain: { in: request.domains } } : {}),
      ...(policy.allowedKnowledgeTypes?.length
        ? { type: { in: policy.allowedKnowledgeTypes } }
        : {}),
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      source: { select: { id: true, name: true, url: true, type: true, note: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 400,
  });

  const entries: KnowledgeBaseEntryRecord[] = rows.map((entry) => ({
    ...entry,
    structuredData: (entry.structuredData as Record<string, unknown> | null) ?? null,
    verifiedAt: entry.verifiedAt?.toISOString() ?? null,
    approvedAt: entry.approvedAt?.toISOString() ?? null,
    lastVerifiedAt: entry.lastVerifiedAt?.toISOString() ?? null,
    nextReviewAt: entry.nextReviewAt?.toISOString() ?? null,
    expiresAt: entry.expiresAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    source: entry.source ?? null,
  }));

  const retrieval = retrieveKnowledgeForAi(entries, {
    query: request.query || (request.productIds?.[0] ?? "knowledge"),
    audience,
    verifiedOnly: policy.requireVerified && request.purpose === "PUBLIC_OUTPUT",
    claimSafeOnly:
      !policy.allowedClaimStatuses.includes("OPINION") &&
      !policy.allowedClaimStatuses.includes("NEEDS_EVIDENCE"),
    limit: limit * 2,
  });

  const facts: AiRetrievedFact[] = [];
  const compatibility =
    request.compatibilityMode !== false && policy.allowLegacyVerifiedWithoutApproval;

  for (const item of retrieval.items) {
    const entry = item.entry;
    const row = rows.find((r) => r.id === entry.id);

    if (!policy.allowedClaimStatuses.includes(entry.claimStatus)) {
      bump("claim_status_not_allowed");
      continue;
    }

    if (
      policy.requireEvidenceForMarketingClaims &&
      entry.claimStatus === "MARKETING_CLAIM" &&
      !entry.evidenceUrl?.trim()
    ) {
      bump("marketing_claim_without_evidence");
      continue;
    }

    if (entry.claimStatus === "NEEDS_EVIDENCE" && request.purpose === "PUBLIC_OUTPUT") {
      bump("needs_evidence_public_output");
      continue;
    }

    const staleness = calculateKnowledgeStaleness({
      expiresAt: row?.expiresAt?.toISOString() ?? null,
      nextReviewAt: row?.nextReviewAt?.toISOString() ?? null,
      lastVerifiedAt: entry.lastVerifiedAt,
      verifiedAt: entry.verifiedAt,
      reviewIntervalDays: row?.reviewIntervalDays ?? null,
    });

    if (staleness.stale && !policy.allowStaleKnowledge) {
      bump("stale_excluded");
      continue;
    }

    const isApproved = Boolean(entry.approvedAt);
    let legacyVerifiedNotApproved = false;

    if (policy.requireApproved && !isApproved) {
      if (
        compatibility &&
        entry.isVerified &&
        (entry.claimStatus === "FACT" || entry.claimStatus === "VERIFIED_CLAIM")
      ) {
        legacyVerifiedNotApproved = true;
        warnings.push(`legacy_verified_not_approved:${entry.id}`);
      } else {
        bump("not_approved");
        continue;
      }
    }

    if (policy.requireVerified && !entry.isVerified && !isApproved) {
      bump("not_verified");
      continue;
    }

    let version = entry.version;
    let approvedAt = entry.approvedAt;
    const latestApproved = await getLatestApprovedKnowledgeVersion(entry.id);
    if (latestApproved) {
      version = latestApproved.version;
      approvedAt = latestApproved.approvedAt;
    }

    const sourceInfo = getEntrySourceInfo(entry);
    const productLinked = entry.relatedProductIds.length > 0;
    const domain =
      entry.structuredData &&
      ("moqValue" in entry.structuredData || "moq" in entry.structuredData)
        ? "moq"
        : entry.structuredData && "leadTime" in entry.structuredData
          ? "lead_time"
          : "general";

    const authorityRank = getAuthorityRank("KNOWLEDGE_BASE", domain, {
      productLinked,
      approved: Boolean(approvedAt),
    });

    const factWarnings = [...item.matchReasons];
    if (legacyVerifiedNotApproved) factWarnings.push("legacy_verified_not_approved");
    if (staleness.reviewDue) factWarnings.push("review_due");
    if (staleness.stale) factWarnings.push("stale");

    facts.push({
      id: `kb-${entry.id}`,
      sourceType: "KNOWLEDGE_BASE",
      sourceId: entry.id,
      title: entry.title,
      summary: entry.summary,
      content: entry.content?.slice(0, 1200) ?? null,
      structuredData: entry.structuredData,
      visibility: entry.visibility,
      publicOutputAllowed:
        entry.visibility === "PUBLIC" && entry.claimStatus !== "NEEDS_EVIDENCE",
      claimStatus: entry.claimStatus,
      confidence: confidenceToNumber(entry.confidence),
      evidenceUrl: entry.evidenceUrl,
      sourceName: sourceInfo.name,
      sourceUrl: sourceInfo.url,
      adminRoute: `/admin/knowledge-base/${entry.id}`,
      authoritativeDomain: entry.domain ?? domain,
      authorityRank,
      authorityReason: productLinked ? "product-linked KB" : "general KB",
      version,
      approvedAt,
      lastVerifiedAt: entry.lastVerifiedAt,
      expiresAt: row?.expiresAt?.toISOString() ?? null,
      stale: staleness.stale,
      reviewDue: staleness.reviewDue,
      legacyVerifiedNotApproved,
      matchedOn: item.matchReasons,
      relevanceScore: item.score,
      warnings: factWarnings,
      relatedMediaBundleIds: entry.relatedMediaBundleIds,
      relatedEntityIds: [
        ...entry.relatedProductIds,
        ...entry.relatedSeoTopicIds,
        ...entry.relatedEntryIds,
      ],
    });
  }

  warnings.push(...retrieval.warnings);

  return {
    facts,
    omitted: [...omittedMap.entries()].map(([reason, count]) => ({ reason, count })),
    warnings: [...new Set(warnings)],
  };
}
