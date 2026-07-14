import "server-only";

import type { SeoTargetEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePrimaryKeyword } from "@/features/content/seo/seo-score-utils";
import { normalizeSeoKeyword } from "@/features/content/seo/seo-keyword-normalize";
import { toSlug } from "@/lib/slug";

export type SeoExistingContentMatch = {
  entityType: SeoTargetEntityType;
  entityId: string;
  title: string;
  url: string;
  adminRoute?: string;
  matchScore: number;
  matchedOn: string[];
};

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalizeSeoKeyword(a).split(/\s+/).filter(Boolean));
  const tb = new Set(normalizeSeoKeyword(b).split(/\s+/).filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap += 1;
  return overlap / Math.max(ta.size, tb.size);
}

export async function matchExistingContentForTopic(input: {
  title: string;
  primaryKeyword: string;
  slug?: string | null;
  targetUrl?: string | null;
  limit?: number;
}): Promise<SeoExistingContentMatch[]> {
  const limit = Math.min(input.limit ?? 20, 50);
  const matches: SeoExistingContentMatch[] = [];
  const slugCandidate = input.slug?.trim() || toSlug(input.title);
  const keywordNorm = normalizePrimaryKeyword(input.primaryKeyword);

  const [blogs, products, categories, landingPages, manufacturing] = await Promise.all([
    prisma.blogPost.findMany({
      select: { id: true, title: true, slug: true, metaTitle: true, status: true },
      take: 200,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.product.findMany({
      select: { id: true, name: true, slug: true, productCode: true },
      take: 200,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      take: 200,
    }),
    prisma.landingPageContent.findMany({
      select: { id: true, title: true, slug: true },
      take: 100,
    }),
    prisma.manufacturingAsset.findMany({
      select: { id: true, title: true, slug: true },
      take: 100,
    }),
  ]);

  for (const post of blogs) {
    const url = `/blog/${post.slug}`;
    const matchedOn: string[] = [];
    let score = 0;
    if (post.slug === slugCandidate) {
      score += 90;
      matchedOn.push("exact_slug");
    }
    if (normalizePrimaryKeyword(post.title) === keywordNorm) {
      score += 85;
      matchedOn.push("exact_title");
    }
    if (post.metaTitle && normalizePrimaryKeyword(post.metaTitle).includes(keywordNorm)) {
      score += 60;
      matchedOn.push("keyword_in_meta_title");
    }
    const overlap = tokenOverlap(input.primaryKeyword, post.title);
    if (overlap >= 0.5) {
      score += Math.round(overlap * 50);
      matchedOn.push("keyword_overlap_title");
    }
    if (score >= 40) {
      matches.push({
        entityType: "BLOG_POST",
        entityId: post.id,
        title: post.title,
        url,
        adminRoute: `/admin/blog/${post.id}`,
        matchScore: Math.min(100, score),
        matchedOn,
      });
    }
  }

  for (const product of products) {
    const url = `/san-pham/${product.slug}`;
    const matchedOn: string[] = [];
    let score = 0;
    if (product.slug === slugCandidate) {
      score += 90;
      matchedOn.push("exact_slug");
    }
    if (normalizePrimaryKeyword(product.name) === keywordNorm) {
      score += 85;
      matchedOn.push("exact_title");
    }
    const overlap = tokenOverlap(input.primaryKeyword, product.name);
    if (overlap >= 0.5) {
      score += Math.round(overlap * 45);
      matchedOn.push("keyword_overlap_title");
    }
    if (score >= 40) {
      matches.push({
        entityType: "PRODUCT",
        entityId: product.id,
        title: product.name,
        url,
        adminRoute: `/admin/products/${product.id}/edit`,
        matchScore: Math.min(100, score),
        matchedOn,
      });
    }
  }

  for (const cat of categories) {
    const url = `/danh-muc/${cat.slug}`;
    let score = 0;
    const matchedOn: string[] = [];
    if (cat.slug === slugCandidate) {
      score += 90;
      matchedOn.push("exact_slug");
    }
    const overlap = tokenOverlap(input.primaryKeyword, cat.name);
    if (overlap >= 0.6) {
      score += Math.round(overlap * 50);
      matchedOn.push("keyword_overlap_name");
    }
    if (score >= 40) {
      matches.push({
        entityType: "CATEGORY",
        entityId: cat.id,
        title: cat.name,
        url,
        adminRoute: `/admin/danh-muc/${cat.id}`,
        matchScore: Math.min(100, score),
        matchedOn,
      });
    }
  }

  for (const page of landingPages) {
    const url = `/${page.slug}`;
    let score = 0;
    const matchedOn: string[] = [];
    if (page.slug === slugCandidate) {
      score += 88;
      matchedOn.push("exact_slug");
    }
    const overlap = tokenOverlap(input.primaryKeyword, page.title);
    if (overlap >= 0.5) {
      score += Math.round(overlap * 45);
      matchedOn.push("keyword_overlap_title");
    }
    if (score >= 40) {
      matches.push({
        entityType: "LANDING_PAGE",
        entityId: page.id,
        title: page.title,
        url,
        adminRoute: `/admin/landing-pages/${page.id}`,
        matchScore: Math.min(100, score),
        matchedOn,
      });
    }
  }

  for (const asset of manufacturing) {
    const url = `/manufacturing/${asset.slug}`;
    let score = 0;
    const matchedOn: string[] = [];
    const overlap = tokenOverlap(input.primaryKeyword, asset.title);
    if (overlap >= 0.55) {
      score += Math.round(overlap * 40);
      matchedOn.push("keyword_overlap_title");
    }
    if (score >= 40) {
      matches.push({
        entityType: "MANUFACTURING_ASSET",
        entityId: asset.id,
        title: asset.title,
        url,
        adminRoute: `/admin/manufacturing-library/${asset.id}`,
        matchScore: Math.min(100, score),
        matchedOn,
      });
    }
  }

  if (input.targetUrl?.trim()) {
    const target = input.targetUrl.trim();
    const exact = matches.find((m) => m.url === target);
    if (!exact) {
      matches.push({
        entityType: "EXTERNAL",
        entityId: target,
        title: target,
        url: target,
        matchScore: 95,
        matchedOn: ["target_url"],
      });
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}
