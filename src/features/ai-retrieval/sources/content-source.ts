import { prisma } from "@/lib/prisma";
import type {
  AiRetrievedFact,
  AiRetrievalOmittedBucket,
  AiRetrievalPolicy,
  AiRetrievalRequest,
} from "@/features/ai-retrieval/ai-retrieval-types";
import { getAuthorityRank } from "@/features/ai-retrieval/ai-authority";

/**
 * Safe published blog snippet adapter for SEO/internal search.
 * No draft or confidential editorial notes.
 */
export async function retrieveContentFacts(
  request: AiRetrievalRequest,
  policy: AiRetrievalPolicy
): Promise<{ facts: AiRetrievedFact[]; omitted: AiRetrievalOmittedBucket[]; warnings: string[] }> {
  if (!policy.sourceScopes.includes("BLOG_POST")) {
    return { facts: [], omitted: [], warnings: [] };
  }
  if (request.sourceTypes && !request.sourceTypes.includes("BLOG_POST")) {
    return { facts: [], omitted: [], warnings: [] };
  }

  const q = request.query.trim();
  const limit = Math.min(request.maxItems ?? policy.maxItems, 10);
  const scopedIds = request.entityIds ?? [];
  if (!q && scopedIds.length === 0) {
    return { facts: [], omitted: [], warnings: [] };
  }
  const rows = await prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        ...(scopedIds.length ? [{ id: { in: scopedIds } }] : []),
        ...(q
          ? [
              { title: { contains: q, mode: "insensitive" as const } },
              { excerpt: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      publishedAt: true,
    },
    take: limit,
    orderBy: { publishedAt: "desc" },
  });

  const facts: AiRetrievedFact[] = rows.map((post) => ({
    id: `blog-${post.id}`,
    sourceType: "BLOG_POST" as const,
    sourceId: post.id,
    title: post.title,
    summary: post.excerpt,
    content: null,
    structuredData: {
      slug: post.slug,
      publishedAt: post.publishedAt?.toISOString() ?? null,
    },
    visibility: "PUBLIC" as const,
    publicOutputAllowed: true,
    claimStatus: "FACT" as const,
    confidence: 0.7,
    sourceName: "Blog",
    sourceUrl: `/blog/${post.slug}`,
    adminRoute: `/admin/blog/${post.id}`,
    authorityRank: getAuthorityRank("BLOG_POST", "general"),
    authorityReason: "Published blog post",
    approvedAt: post.publishedAt?.toISOString() ?? null,
    stale: false,
    matchedOn: ["blog_search"],
    relevanceScore: 10,
    warnings: [],
  }));

  return { facts, omitted: [], warnings: [] };
}
