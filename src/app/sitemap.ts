import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";

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
  // Only strip a trailing slash when there is a path after the origin
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, blogPosts, legacyPosts] = await Promise.all([
    // Layer 1: filter empty slugs at the DB level
    prisma.category.findMany({
      where: { slug: { not: "" } },
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

  const posts =
    blogPosts.length > 0
      ? blogPosts
      : legacyPosts;

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/dai-ly`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/lien-he`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/nguon-hang`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/oem`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/qua-tang-doanh-nghiep`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/chinh-sach-dai-ly`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Knowledge cluster — fabric, size, color guides (Sprint 18.5)
    {
      url: `${SITE_URL}/bang-mau-ao-thun-tron`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/size-ao-thun-tron`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/vai-cotton-2-chieu`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/vai-cvc-la-gi`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/vai-tc-la-gi`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Wholesale blank apparel SEO cluster (Sprint 18)
    {
      url: `${SITE_URL}/kho-ao-thun-tron`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ao-thun-tron-si`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/nguon-hang-ao-thun-tron`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/kho-ao-polo-tron`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ao-polo-tron-si`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Industry landing pages (Sprint 17)
    {
      url: `${SITE_URL}/ao-thun-cong-ty`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ao-thun-su-kien`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ao-thun-team-building`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ao-thun-nhan-vien`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ao-thun-doanh-nghiep`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // Layer 2: guard at build time — skip any slug that is still empty after DB filter
  const categoryRoutes: MetadataRoute.Sitemap = categories
    .filter((cat) => isValidSlug(cat.slug))
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

  // Layer 3: deduplicate the final array by URL
  return dedup([
    ...staticRoutes,
    ...categoryRoutes,
    ...productRoutes,
    ...blogRoutes,
  ]);
}
