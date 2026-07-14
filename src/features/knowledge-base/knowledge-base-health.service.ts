import { prisma } from "@/lib/prisma";
import {
  getExpectedStructuredKeysForType,
  hasStructuredField,
  structuredDataCoveragePercent,
} from "@/features/knowledge-base/knowledge-base-structured-schema";
import { isClaimSafeForAiOutput } from "@/features/knowledge-base/knowledge-base-claim-governance";

export type KnowledgeHealthScore = {
  totalEntries: number;
  activeEntries: number;
  coverage: {
    withSummary: number;
    withContent: number;
    withStructuredData: number;
    withTags: number;
    withSource: number;
    withRelations: number;
    withMediaLinks: number;
    percent: number;
  };
  completeness: {
    averageStructuredCoverage: number;
    structuredPercent: number;
  };
  governance: {
    approvedPercent: number;
    verifiedPercent: number;
    claimSafePercent: number;
    withEvidencePercent: number;
    versionCoveragePercent: number;
  };
  visibility: {
    public: number;
    internal: number;
    confidential: number;
    publicPercent: number;
    internalPercent: number;
    confidentialPercent: number;
  };
  relationships: {
    withProducts: number;
    withBlogPosts: number;
    withMediaBundles: number;
    withSeoTopics: number;
    withRelatedEntries: number;
    relationshipCoveragePercent: number;
  };
  domainBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  warnings: string[];
};

function pct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

export async function calculateKnowledgeHealthScore(): Promise<KnowledgeHealthScore> {
  const entries = await prisma.knowledgeBaseEntry.findMany({
    select: {
      id: true,
      type: true,
      status: true,
      summary: true,
      content: true,
      structuredData: true,
      tags: true,
      sourceId: true,
      isVerified: true,
      approvedAt: true,
      approvedBy: true,
      evidenceUrl: true,
      claimStatus: true,
      visibility: true,
      version: true,
      domain: true,
      relatedProductIds: true,
      relatedBlogPostIds: true,
      relatedMediaBundleIds: true,
      relatedSeoTopicIds: true,
      relatedEntryIds: true,
      relatedLandingPageSlugs: true,
    },
  });

  const versionCounts = await prisma.knowledgeBaseEntryVersion.groupBy({
    by: ["entryId"],
    _count: { entryId: true },
  });
  const entriesWithVersions = new Set(versionCounts.map((row) => row.entryId));

  const total = entries.length;
  const active = entries.filter((e) => e.status === "ACTIVE").length;

  let withSummary = 0;
  let withContent = 0;
  let withStructured = 0;
  let withTags = 0;
  let withSource = 0;
  let withRelations = 0;
  let withMedia = 0;
  let structuredCoverageSum = 0;
  let verified = 0;
  let approved = 0;
  let claimSafe = 0;
  let withEvidence = 0;
  let withProducts = 0;
  let withBlog = 0;
  let withBundles = 0;
  let withSeo = 0;
  let withKbLinks = 0;
  let publicCount = 0;
  let internalCount = 0;
  let confidentialCount = 0;

  const domainBreakdown: Record<string, number> = {};
  const typeBreakdown: Record<string, number> = {};

  for (const entry of entries) {
    typeBreakdown[entry.type] = (typeBreakdown[entry.type] ?? 0) + 1;
    const domainKey = entry.domain?.trim() || "unspecified";
    domainBreakdown[domainKey] = (domainBreakdown[domainKey] ?? 0) + 1;

    if (entry.summary?.trim()) withSummary += 1;
    if (entry.content?.trim() && entry.content.trim().length >= 40) withContent += 1;

    const structured = (entry.structuredData as Record<string, unknown> | null) ?? null;
    if (structured && Object.keys(structured).length > 0) withStructured += 1;
    structuredCoverageSum += structuredDataCoveragePercent(
      structured,
      getExpectedStructuredKeysForType(entry.type)
    );

    if (entry.tags.length > 0) withTags += 1;
    if (entry.sourceId) withSource += 1;
    if (entry.isVerified) verified += 1;
    if (entry.approvedAt) approved += 1;
    if (isClaimSafeForAiOutput(entry.claimStatus)) claimSafe += 1;
    if (entry.evidenceUrl?.trim()) withEvidence += 1;

    const hasRel =
      entry.relatedProductIds.length > 0 ||
      entry.relatedBlogPostIds.length > 0 ||
      entry.relatedLandingPageSlugs.length > 0 ||
      entry.relatedMediaBundleIds.length > 0 ||
      entry.relatedSeoTopicIds.length > 0 ||
      entry.relatedEntryIds.length > 0;
    if (hasRel) withRelations += 1;
    if (entry.relatedMediaBundleIds.length > 0) withMedia += 1;
    if (entry.relatedProductIds.length > 0) withProducts += 1;
    if (entry.relatedBlogPostIds.length > 0) withBlog += 1;
    if (entry.relatedMediaBundleIds.length > 0) withBundles += 1;
    if (entry.relatedSeoTopicIds.length > 0) withSeo += 1;
    if (entry.relatedEntryIds.length > 0) withKbLinks += 1;

    if (entry.visibility === "PUBLIC") publicCount += 1;
    else if (entry.visibility === "CONFIDENTIAL") confidentialCount += 1;
    else internalCount += 1;
  }

  const coverageFields = [
    withSummary,
    withContent,
    withStructured,
    withTags,
    withSource,
    withRelations,
    withMedia,
  ];
  const coveragePercent = Math.round(
    coverageFields.reduce((sum, n) => sum + pct(n, total), 0) / coverageFields.length
  );

  const relationshipFields = [withProducts, withBlog, withBundles, withSeo, withKbLinks];
  const relationshipCoveragePercent = Math.round(
    relationshipFields.reduce((sum, n) => sum + pct(n, total), 0) / relationshipFields.length
  );

  const warnings: string[] = [];
  if (total === 0) warnings.push("Knowledge Base chưa có entry nào.");
  if (pct(withStructured, total) < 50) warnings.push("Dưới 50% entry có structuredData.");
  if (pct(verified, total) < 30) warnings.push("Tỷ lệ verified thấp — AI cần kiểm chứng thêm.");
  if (pct(withMedia, total) < 10) warnings.push("Ít entry liên kết Media Bundle.");
  if (confidentialCount > 0 && publicCount === 0) {
    warnings.push("Có entry confidential nhưng chưa có entry public — kiểm tra visibility.");
  }

  return {
    totalEntries: total,
    activeEntries: active,
    coverage: {
      withSummary,
      withContent,
      withStructuredData: withStructured,
      withTags,
      withSource,
      withRelations,
      withMediaLinks: withMedia,
      percent: coveragePercent,
    },
    completeness: {
      averageStructuredCoverage: total > 0 ? Math.round(structuredCoverageSum / total) : 0,
      structuredPercent: pct(withStructured, total),
    },
    governance: {
      approvedPercent: pct(approved, total),
      verifiedPercent: pct(verified, total),
      claimSafePercent: pct(claimSafe, total),
      withEvidencePercent: pct(withEvidence, total),
      versionCoveragePercent: pct(entriesWithVersions.size, total),
    },
    visibility: {
      public: publicCount,
      internal: internalCount,
      confidential: confidentialCount,
      publicPercent: pct(publicCount, total),
      internalPercent: pct(internalCount, total),
      confidentialPercent: pct(confidentialCount, total),
    },
    relationships: {
      withProducts,
      withBlogPosts: withBlog,
      withMediaBundles: withBundles,
      withSeoTopics: withSeo,
      withRelatedEntries: withKbLinks,
      relationshipCoveragePercent,
    },
    domainBreakdown,
    typeBreakdown,
    warnings,
  };
}

export async function detectMoqDuplicationIssues(): Promise<
  Array<{
    productId: string;
    productName: string;
    productMoq: number | null;
    knowledgeEntries: Array<{ id: string; title: string; moq: string | number | null }>;
  }>
> {
  const products = await prisma.product.findMany({
    where: { defaultMoq: { not: null } },
    select: { id: true, name: true, defaultMoq: true },
    take: 200,
  });

  const kbEntries = await prisma.knowledgeBaseEntry.findMany({
    where: {
      OR: [{ type: "PRODUCT" }, { type: "PRICING" }, { type: "POLICY" }, { type: "OEM" }],
      relatedProductIds: { isEmpty: false },
    },
    select: {
      id: true,
      title: true,
      relatedProductIds: true,
      structuredData: true,
    },
  });

  const issues: Array<{
    productId: string;
    productName: string;
    productMoq: number | null;
    knowledgeEntries: Array<{ id: string; title: string; moq: string | number | null }>;
  }> = [];

  for (const product of products) {
    const linked = kbEntries.filter((e) => e.relatedProductIds.includes(product.id));
    if (linked.length === 0) continue;

    const knowledgeMoqs = linked.map((entry) => {
      const data = (entry.structuredData as Record<string, unknown> | null) ?? {};
      const moq =
        typeof data.moqValue === "number"
          ? data.moqValue
          : typeof data.moq === "string"
            ? data.moq
            : null;
      return { id: entry.id, title: entry.title, moq };
    });

    const conflicting = knowledgeMoqs.filter((item) => {
      if (item.moq == null || product.defaultMoq == null) return false;
      if (typeof item.moq === "number") return item.moq !== product.defaultMoq;
      const parsed = Number(String(item.moq).replace(/[^\d]/g, ""));
      return Number.isFinite(parsed) && parsed !== product.defaultMoq;
    });

    if (conflicting.length > 0) {
      issues.push({
        productId: product.id,
        productName: product.name,
        productMoq: product.defaultMoq,
        knowledgeEntries: knowledgeMoqs,
      });
    }
  }

  return issues;
}

export function summarizeAuthoritativeMoqOwner(): string {
  return "Product.defaultMoq là nguồn chính cho MOQ sản phẩm; Knowledge Base chỉ mô tả chính sách chung (PRICING/POLICY/OEM) hoặc override có evidence.";
}
