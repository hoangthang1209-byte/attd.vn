import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";
import {
  INDEXABLE_STATIC_COMMERCIAL_PATHS,
  isIndexableCategoryLanding,
  isReservedStaticPublicSlug,
  normalizeCategorySlug,
} from "@/lib/seo/indexable-category-routes";

/** True when the slug is a non-empty, non-whitespace string. */
function isValidSlug(slug: string | null | undefined): slug is string {
  return typeof slug === "string" && slug.trim().length > 0;
}

/**
 * Normalise a URL for deduplication purposes:
 *  - strip one trailing slash (so /foo/ and /foo compare equal)
 *  - but keep the bare origin intact (https://www.attd.vn stays as-is)
 */
function normalizeUrl(url: string): string {
  return url.replace(/([^/])\/$/, "$1");
}

/** De-duplicate sitemap entries by normalised URL, keeping the first occurrence. */
function dedup(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return entries
    .map((entry) => ({ ...entry, url: normalizeUrl(entry.url) }))
    .filter((entry) => {
      if (seen.has(entry.url)) return false;
      seen.add(entry.url);
      return true;
    });
}

/** Build static commercial routes for sitemap (always available without DB). */
function buildStaticSitemapRoutes(): MetadataRoute.Sitemap {
  return INDEXABLE_STATIC_COMMERCIAL_PATHS.map((path) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" || path === "/san-pham" ? ("weekly" as const) : ("monthly" as const),
    priority: path === "/" ? 1.0 : path === "/san-pham" ? 0.9 : 0.7,
  }));
}

type DynamicSitemapData = {
  categories: Array<{ slug: string; updatedAt: Date }>;
  products: Array<{ slug: string; updatedAt: Date }>;
  posts: Array<{ slug: string; updatedAt: Date }>;
};

/** Load DB-backed sitemap entries; fall back to static-only when DB is unavailable. */
async function loadDynamicSitemapData(): Promise<DynamicSitemapData> {
  try {
    const [categories, products, blogPosts, legacyPosts] = await Promise.all([
      prisma.category.findMany({
        where: { slug: { not: "" }, isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.product.findMany({
        where: { status: "ACTIVE", slug: { not: "" } },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.blogPost.findMany({
        where: { status: "PUBLISHED", slug: { not: "" } },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.post.findMany({
        where: { status: "PUBLISHED", slug: { not: "" } },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return {
      categories,
      products,
      posts: blogPosts.length > 0 ? blogPosts : legacyPosts,
    };
  } catch (error) {
    console.warn(
      "[sitemap] Database unavailable during sitemap generation; serving static routes only.",
      error,
    );
    return { categories: [], products: [], posts: [] };
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = buildStaticSitemapRoutes();
  const { categories, products, posts } = await loadDynamicSitemapData();

  const categoryRoutes: MetadataRoute.Sitemap = categories
    .filter((cat) => {
      if (!isValidSlug(cat.slug)) return false;
      const normalized = normalizeCategorySlug(cat.slug);
      if (isReservedStaticPublicSlug(normalized)) return false;
      return isIndexableCategoryLanding(normalized);
    })
    .map((cat) => ({
      url: `${SITE_URL}/${cat.slug}`,
      lastModified: cat.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((product) => isValidSlug(product.slug))
    .map((product) => ({
      url: `${SITE_URL}/san-pham/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const blogRoutes: MetadataRoute.Sitemap = posts
    .filter((post) => isValidSlug(post.slug))
    .map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return dedup([...staticRoutes, ...categoryRoutes, ...productRoutes, ...blogRoutes]);
}
