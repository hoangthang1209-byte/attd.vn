import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Server-side smoke helper for a published Blog.
 * Run only after explicit manual publication — never auto-publishes.
 */
export async function smokePublishedBlogPost(blogPostId: string): Promise<{
  ok: boolean;
  checks: Array<{ id: string; pass: boolean; detail: string }>;
}> {
  const post = await prisma.blogPost.findUnique({
    where: { id: blogPostId },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      metaTitle: true,
      metaDescription: true,
      featuredImageUrl: true,
      content: true,
      mediaBundleId: true,
    },
  });

  const checks: Array<{ id: string; pass: boolean; detail: string }> = [];

  if (!post) {
    return {
      ok: false,
      checks: [{ id: "exists", pass: false, detail: "Blog post not found" }],
    };
  }

  checks.push({
    id: "status_published",
    pass: post.status === "PUBLISHED",
    detail: `status=${post.status}`,
  });
  checks.push({
    id: "slug_resolves",
    pass: Boolean(post.slug?.trim()),
    detail: post.slug ?? "missing slug",
  });
  checks.push({
    id: "title_meta",
    pass: Boolean(post.title?.trim()) && Boolean(post.metaTitle?.trim() || post.title?.trim()),
    detail: `title=${Boolean(post.title)} metaTitle=${Boolean(post.metaTitle)}`,
  });
  checks.push({
    id: "published_at",
    pass: post.publishedAt != null,
    detail: post.publishedAt?.toISOString() ?? "missing publishedAt",
  });

  const html = post.content ?? "";
  checks.push({
    id: "no_admin_urls",
    pass: !html.includes("/admin/"),
    detail: html.includes("/admin/") ? "content contains /admin/ URLs" : "ok",
  });

  if (post.mediaBundleId) {
    const privateCount = await prisma.mediaBundleSlotAsset.count({
      where: {
        mediaBundleSlot: { mediaBundleId: post.mediaBundleId },
        mediaAsset: { visibility: { not: "PUBLIC" } },
      },
    });
    checks.push({
      id: "public_media_only",
      pass: privateCount === 0,
      detail: privateCount === 0 ? "ok" : `${privateCount} non-public assets in bundle`,
    });
  } else {
    checks.push({
      id: "public_media_only",
      pass: true,
      detail: "no bundle linked",
    });
  }

  // Sitemap source inclusion (same visibility as public listing)
  const inSitemapSource = await prisma.blogPost.count({
    where: {
      id: post.id,
      status: "PUBLISHED",
      slug: { not: "" },
      publishedAt: { not: null },
    },
  });
  checks.push({
    id: "sitemap_source",
    pass: inSitemapSource === 1,
    detail: inSitemapSource === 1 ? "included in published set" : "not in sitemap source query",
  });

  return {
    ok: checks.every((c) => c.pass),
    checks,
  };
}
