import { prisma } from "@/lib/prisma";
import type {
  AiRetrievedFact,
  AiRetrievalOmittedBucket,
  AiRetrievalPolicy,
  AiRetrievalRequest,
} from "@/features/ai-retrieval/ai-retrieval-types";
import { getAuthorityRank } from "@/features/ai-retrieval/ai-authority";
import { resolveEffectiveMaxVisibility } from "@/features/ai-retrieval/ai-retrieval-policy";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function retrieveManufacturingFacts(
  request: AiRetrievalRequest,
  policy: AiRetrievalPolicy
): Promise<{ facts: AiRetrievedFact[]; omitted: AiRetrievalOmittedBucket[]; warnings: string[] }> {
  const omittedMap = new Map<string, number>();
  const bump = (reason: string) => omittedMap.set(reason, (omittedMap.get(reason) ?? 0) + 1);
  const warnings: string[] = [];
  const maxVisibility = resolveEffectiveMaxVisibility(policy, request.purpose);
  const limit = Math.min(request.maxItems ?? policy.maxItems, 20);
  const q = request.query.trim();

  const visibilityFilter =
    maxVisibility === "PUBLIC"
      ? { visibility: "PUBLIC" as const }
      : maxVisibility === "INTERNAL"
        ? { visibility: { in: ["PUBLIC", "DEALER_ONLY", "CUSTOMER_ONLY", "INTERNAL"] as Array<"PUBLIC" | "DEALER_ONLY" | "CUSTOMER_ONLY" | "INTERNAL"> } }
        : {};

  const rows = await prisma.manufacturingAsset.findMany({
    where: {
      status: "PUBLISHED",
      ...visibilityFilter,
      ...(request.entityIds?.length ? { id: { in: request.entityIds } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      visibility: true,
      status: true,
      publishedAt: true,
      category: { select: { id: true, name: true, slug: true } },
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  const facts: AiRetrievedFact[] = [];

  for (const asset of rows) {
    if (request.purpose === "PUBLIC_OUTPUT" && asset.visibility !== "PUBLIC") {
      bump("manufacturing_internal_excluded");
      continue;
    }

    const nq = normalizeText(q);
    const matchedOn: string[] = [];
    let relevanceScore = 8;
    if (nq && normalizeText(asset.title).includes(nq)) {
      relevanceScore += 15;
      matchedOn.push("title_phrase");
    }

    const visibility =
      asset.visibility === "PUBLIC"
        ? ("PUBLIC" as const)
        : ("INTERNAL" as const);

    facts.push({
      id: `mfg-${asset.id}`,
      sourceType: "MANUFACTURING_ASSET",
      sourceId: asset.id,
      title: asset.title,
      summary: asset.description?.slice(0, 240) ?? null,
      content: asset.description?.slice(0, 800) ?? null,
      structuredData: {
        category: asset.category?.name ?? null,
        slug: asset.slug,
        publishedAt: asset.publishedAt?.toISOString() ?? null,
        manufacturingVisibility: asset.visibility,
      },
      visibility,
      publicOutputAllowed: asset.visibility === "PUBLIC",
      claimStatus: "FACT",
      confidence: 0.85,
      sourceName: "Manufacturing Library",
      sourceUrl: asset.slug ? `/admin/manufacturing-library/${asset.id}` : null,
      adminRoute: `/admin/manufacturing-library/${asset.id}`,
      authoritativeDomain: "general",
      authorityRank: getAuthorityRank("MANUFACTURING_ASSET", "general"),
      authorityReason: "Published manufacturing asset",
      approvedAt: asset.publishedAt?.toISOString() ?? null,
      lastVerifiedAt: asset.publishedAt?.toISOString() ?? null,
      stale: false,
      matchedOn,
      relevanceScore,
      warnings: [],
      relatedEntityIds: asset.category ? [asset.category.id] : [],
    });
  }

  return {
    facts,
    omitted: [...omittedMap.entries()].map(([reason, count]) => ({ reason, count })),
    warnings,
  };
}
