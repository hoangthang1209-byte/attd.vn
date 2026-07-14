import "server-only";

import type { SeoContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidateBlogPaths } from "@/features/blog/revalidate";
import { toSlug } from "@/lib/slug";
import { getSeoContentBrief } from "@/features/content/services/seo-brief.service";

const BLOG_COMPATIBLE: SeoContentType[] = [
  "BLOG_ARTICLE",
  "COMPARISON",
  "KNOWLEDGE_BASE",
  "FAQ",
  "GLOSSARY",
  "PRODUCT_GUIDE",
  "OTHER",
];

export type ContentHandoffResult = {
  supported: boolean;
  entityType: string;
  entityId?: string;
  adminRoute?: string;
  message?: string;
};

export function isBlogCompatibleContentType(contentType: SeoContentType): boolean {
  return BLOG_COMPATIBLE.includes(contentType);
}

export async function createBlogDraftFromTopic(
  topicId: string,
): Promise<ContentHandoffResult> {
  const topic = await prisma.seoTopic.findUnique({
    where: { id: topicId },
    include: { keywords: true },
  });
  if (!topic) throw new Error("Không tìm thấy chủ đề SEO.");

  if (!isBlogCompatibleContentType(topic.contentType)) {
    return {
      supported: false,
      entityType: topic.contentType,
      message: `Loại nội dung ${topic.contentType} chưa hỗ trợ tạo bản nháp Blog.`,
    };
  }

  if (topic.targetEntityType === "BLOG_POST" && topic.targetEntityId) {
    const existing = await prisma.blogPost.findUnique({ where: { id: topic.targetEntityId } });
    if (existing) {
      return {
        supported: true,
        entityType: "BLOG_POST",
        entityId: existing.id,
        adminRoute: `/admin/blog/${existing.id}`,
        message: "Chủ đề đã liên kết Blog — mở bài viết hiện có.",
      };
    }
  }

  const brief = await getSeoContentBrief(topicId);
  const title = brief?.workingTitle?.trim() || topic.title;
  const slug = brief?.proposedSlug?.trim() || topic.slug?.trim() || toSlug(title);
  if (!slug) throw new Error("Không thể tạo slug cho bài Blog.");

  const slugTaken = await prisma.blogPost.findUnique({ where: { slug } });
  if (slugTaken) throw new Error(`Slug Blog "${slug}" đã tồn tại.`);

  const tagKeywords = topic.keywords
    .filter((k) => k.keywordType !== "NEGATIVE")
    .slice(0, 12)
    .map((k) => k.keyword);

  const result = await prisma.$transaction(async (tx) => {
    const post = await tx.blogPost.create({
      data: {
        title,
        slug,
        excerpt: brief?.valueProposition?.slice(0, 300) ?? null,
        metaTitle: brief?.metaTitle ?? null,
        metaDescription: brief?.metaDescription ?? null,
        canonicalUrl: topic.canonicalUrl,
        status: "DRAFT",
        tags: tagKeywords,
        mediaBundleId: topic.mediaBundleId,
      },
    });

    await tx.seoTopic.update({
      where: { id: topicId },
      data: {
        targetEntityType: "BLOG_POST",
        targetEntityId: post.id,
        targetUrl: `/blog/${post.slug}`,
        status: topic.status === "IDEA" || topic.status === "APPROVED" ? "DRAFTING" : topic.status,
      },
    });

    return post;
  });

  revalidateBlogPaths(result.slug);

  return {
    supported: true,
    entityType: "BLOG_POST",
    entityId: result.id,
    adminRoute: `/admin/blog/${result.id}`,
  };
}

export async function prepareLandingPageHandoff(topicId: string): Promise<ContentHandoffResult> {
  const topic = await prisma.seoTopic.findUnique({ where: { id: topicId } });
  if (!topic) throw new Error("Không tìm thấy chủ đề SEO.");
  return {
    supported: false,
    entityType: "LANDING_PAGE",
    message: "Landing Page handoff sẽ được hỗ trợ ở sprint sau.",
  };
}
