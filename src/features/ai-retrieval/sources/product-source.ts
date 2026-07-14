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

/**
 * Public-safe product adapter. Never returns costPrice, margins, or supplier data.
 */
export async function retrieveProductFacts(
  request: AiRetrievalRequest,
  policy: AiRetrievalPolicy
): Promise<{ facts: AiRetrievedFact[]; omitted: AiRetrievalOmittedBucket[]; warnings: string[] }> {
  const omittedMap = new Map<string, number>();
  const bump = (reason: string) => omittedMap.set(reason, (omittedMap.get(reason) ?? 0) + 1);
  const warnings: string[] = [];
  const maxVisibility = resolveEffectiveMaxVisibility(policy, request.purpose);
  const limit = Math.min(request.maxItems ?? policy.maxItems, 20);
  const q = request.query.trim();

  const rows = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      ...(request.productIds?.length ? { id: { in: request.productIds } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { productCode: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { tags: { has: q } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      productCode: true,
      shortDescription: true,
      description: true,
      material: true,
      gsm: true,
      form: true,
      fit: true,
      defaultMoq: true,
      leadTime: true,
      supportsPrinting: true,
      supportsEmbroidery: true,
      supportsOem: true,
      tags: true,
      useCases: true,
      targetCustomers: true,
      category: { select: { id: true, name: true, slug: true } },
      variants: {
        where: { variantStatus: "ACTIVE" },
        select: {
          id: true,
          moqOverride: true,
          leadTimeOverride: true,
          materialOverride: true,
        },
        take: 20,
      },
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  if (policy.allowPricingCostData) {
    warnings.push("pricing_cost_data_requested_but_product_adapter_never_exposes_cost");
  }

  const facts: AiRetrievedFact[] = rows.map((product) => {
    const variantWithMoq = product.variants.find((v) => v.moqOverride != null);
    const variantWithLead = product.variants.find((v) => v.leadTimeOverride);
    const moq = variantWithMoq?.moqOverride ?? product.defaultMoq;
    const leadTime = variantWithLead?.leadTimeOverride ?? product.leadTime;

    const structuredData: Record<string, unknown> = {
      productCode: product.productCode,
      material: product.material,
      gsm: product.gsm,
      form: product.form,
      fit: product.fit,
      defaultMoq: product.defaultMoq,
      moqValue: moq,
      leadTime,
      supportsPrinting: product.supportsPrinting,
      supportsEmbroidery: product.supportsEmbroidery,
      supportsOem: product.supportsOem,
      category: product.category.name,
      useCases: product.useCases,
      targetCustomers: product.targetCustomers,
    };

    const nq = normalizeText(q);
    const matchedOn: string[] = [];
    let relevanceScore = 10;
    if (nq && normalizeText(product.name).includes(nq)) {
      relevanceScore += 15;
      matchedOn.push("title_phrase");
    }
    if (product.productCode && nq && normalizeText(product.productCode).includes(nq)) {
      relevanceScore += 12;
      matchedOn.push("product_code");
    }
    if (request.productIds?.includes(product.id)) {
      relevanceScore += 20;
      matchedOn.push("entity_scope");
    }

    const authorityDomain = moq != null ? "moq" : leadTime ? "lead_time" : "general";
    const authorityRank = getAuthorityRank("PRODUCT", authorityDomain);

    return {
      id: `product-${product.id}`,
      sourceType: "PRODUCT" as const,
      sourceId: product.id,
      title: product.name,
      summary: product.shortDescription,
      content: product.description?.slice(0, 800) ?? null,
      structuredData,
      visibility: "PUBLIC" as const,
      publicOutputAllowed: maxVisibility === "PUBLIC" || maxVisibility === "INTERNAL",
      claimStatus: "FACT" as const,
      confidence: 0.95,
      evidenceUrl: null,
      sourceName: "Product master",
      sourceUrl: `/san-pham/${product.slug}`,
      adminRoute: `/admin/products/${product.id}/edit`,
      authoritativeDomain: authorityDomain,
      authorityRank,
      authorityReason:
        variantWithMoq || variantWithLead
          ? "Product master with variant override preferred"
          : "Product.defaultMoq / leadTime authoritative",
      version: null,
      approvedAt: null,
      lastVerifiedAt: null,
      expiresAt: null,
      stale: false,
      matchedOn,
      relevanceScore,
      warnings: [],
      relatedEntityIds: [product.category.id],
    };
  });

  if (rows.length === 0 && q) bump("product_no_match");

  return {
    facts,
    omitted: [...omittedMap.entries()].map(([reason, count]) => ({ reason, count })),
    warnings,
  };
}
