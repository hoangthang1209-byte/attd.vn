import type { BlogPostStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeBlogContent } from "@/features/blog/markdown";
import { parseFaqJson, parseTagsJson } from "@/features/blog/content-processor";
import { revalidateBlogPaths } from "@/features/blog/revalidate";
import type {
  BlogCategoryRecord,
  BlogPostInput,
  BlogPostListItem,
  BlogPostRecord,
} from "@/features/blog/types";

function mapCategory(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}): BlogCategoryRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isVisible: row.isVisible,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPost(row: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featuredImageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  status: BlogPostStatus;
  publishedAt: Date | null;
  faqJson: unknown;
  tags: unknown;
  createdAt: Date;
  updatedAt: Date;
  categories: {
    category: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      isVisible: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
  }[];
}): BlogPostRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    featuredImageUrl: row.featuredImageUrl,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    canonicalUrl: row.canonicalUrl,
    ogImageUrl: row.ogImageUrl,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    faqJson: parseFaqJson(row.faqJson),
    tags: parseTagsJson(row.tags),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    categories: row.categories.map((item) => mapCategory(item.category)),
  };
}

function mapListItem(row: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  status: BlogPostStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  categories: { category: { id: string; name: string; slug: string } }[];
}): BlogPostListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    featuredImageUrl: row.featuredImageUrl,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    categories: row.categories.map((item) => item.category),
  };
}

const postInclude = {
  categories: {
    include: { category: true },
  },
} as const;

export async function listBlogPostsAdmin(params: {
  search?: string;
  status?: BlogPostStatus;
  categoryId?: string;
}): Promise<BlogPostListItem[]> {
  const where: Prisma.BlogPostWhereInput = {};
  if (params.search?.trim()) {
    where.OR = [
      { title: { contains: params.search.trim(), mode: "insensitive" } },
      { slug: { contains: params.search.trim(), mode: "insensitive" } },
      { excerpt: { contains: params.search.trim(), mode: "insensitive" } },
    ];
  }
  if (params.status) where.status = params.status;
  if (params.categoryId) {
    where.categories = { some: { categoryId: params.categoryId } };
  }

  const rows = await prisma.blogPost.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
    },
  });

  return rows.map(mapListItem);
}

export async function getBlogPostById(id: string): Promise<BlogPostRecord | null> {
  const row = await prisma.blogPost.findUnique({
    where: { id },
    include: postInclude,
  });
  return row ? mapPost(row) : null;
}

export async function createBlogPost(input: BlogPostInput): Promise<BlogPostRecord> {
  const status = input.status ?? "DRAFT";
  const content = input.content ? normalizeBlogContent(input.content) : null;

  const row = await prisma.blogPost.create({
    data: {
      title: input.title.trim(),
      slug: input.slug.trim(),
      excerpt: input.excerpt?.trim() || null,
      content,
      featuredImageUrl: input.featuredImageUrl?.trim() || null,
      metaTitle: input.metaTitle?.trim() || null,
      metaDescription: input.metaDescription?.trim() || null,
      canonicalUrl: input.canonicalUrl?.trim() || null,
      ogImageUrl: input.ogImageUrl?.trim() || null,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      faqJson: input.faqJson ?? [],
      tags: input.tags ?? [],
      categories: input.categoryIds?.length
        ? {
            create: input.categoryIds.map((categoryId) => ({ categoryId })),
          }
        : undefined,
    },
    include: postInclude,
  });

  revalidateBlogPaths(row.slug);
  return mapPost(row);
}

export async function updateBlogPost(
  id: string,
  input: Partial<BlogPostInput>
): Promise<BlogPostRecord | null> {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return null;

  const nextStatus = input.status ?? existing.status;
  const publishedAt =
    nextStatus === "PUBLISHED"
      ? existing.publishedAt ?? new Date()
      : nextStatus === "DRAFT"
        ? null
        : existing.publishedAt;

  const row = await prisma.blogPost.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.slug !== undefined ? { slug: input.slug.trim() } : {}),
      ...(input.excerpt !== undefined ? { excerpt: input.excerpt?.trim() || null } : {}),
      ...(input.content !== undefined
        ? { content: input.content ? normalizeBlogContent(input.content) : null }
        : {}),
      ...(input.featuredImageUrl !== undefined
        ? { featuredImageUrl: input.featuredImageUrl?.trim() || null }
        : {}),
      ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle?.trim() || null } : {}),
      ...(input.metaDescription !== undefined
        ? { metaDescription: input.metaDescription?.trim() || null }
        : {}),
      ...(input.canonicalUrl !== undefined
        ? { canonicalUrl: input.canonicalUrl?.trim() || null }
        : {}),
      ...(input.ogImageUrl !== undefined ? { ogImageUrl: input.ogImageUrl?.trim() || null } : {}),
      ...(input.status !== undefined ? { status: input.status, publishedAt } : {}),
      ...(input.faqJson !== undefined ? { faqJson: input.faqJson } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
    },
    include: postInclude,
  });

  if (input.categoryIds !== undefined) {
    await prisma.blogPostCategory.deleteMany({ where: { postId: id } });
    if (input.categoryIds.length > 0) {
      await prisma.blogPostCategory.createMany({
        data: input.categoryIds.map((categoryId) => ({ postId: id, categoryId })),
      });
    }
    const refreshed = await prisma.blogPost.findUnique({
      where: { id },
      include: postInclude,
    });
    if (refreshed) {
      revalidateBlogPaths(refreshed.slug, existing.slug !== refreshed.slug ? existing.slug : undefined);
      return mapPost(refreshed);
    }
  }

  revalidateBlogPaths(row.slug, existing.slug !== row.slug ? existing.slug : undefined);
  return mapPost(row);
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.blogPost.delete({ where: { id } });
  revalidateBlogPaths(existing.slug);
  return true;
}

export async function setBlogPostStatus(
  id: string,
  status: BlogPostStatus
): Promise<BlogPostRecord | null> {
  return updateBlogPost(id, { status });
}

export async function listBlogCategoriesAdmin(): Promise<BlogCategoryRecord[]> {
  const rows = await prisma.blogCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });
  return rows.map((row) => ({
    ...mapCategory(row),
    postCount: row._count.posts,
  }));
}

export async function createBlogCategory(input: {
  name: string;
  slug: string;
  description?: string | null;
  isVisible?: boolean;
}): Promise<BlogCategoryRecord> {
  const row = await prisma.blogCategory.create({
    data: {
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description?.trim() || null,
      isVisible: input.isVisible ?? true,
    },
  });
  revalidateBlogPaths(undefined, row.slug);
  return mapCategory(row);
}

export async function updateBlogCategory(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string | null;
    isVisible?: boolean;
  }
): Promise<BlogCategoryRecord | null> {
  const existing = await prisma.blogCategory.findUnique({ where: { id } });
  if (!existing) return null;

  const row = await prisma.blogCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.slug !== undefined ? { slug: input.slug.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.isVisible !== undefined ? { isVisible: input.isVisible } : {}),
    },
  });

  revalidateBlogPaths(undefined, row.slug);
  if (existing.slug !== row.slug) {
    revalidateBlogPaths(undefined, existing.slug);
  }
  return mapCategory(row);
}

export async function deleteBlogCategory(id: string): Promise<boolean> {
  const existing = await prisma.blogCategory.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.blogCategory.delete({ where: { id } });
  revalidateBlogPaths(undefined, existing.slug);
  return true;
}

export function isValidBlogPostStatus(value: string): value is BlogPostStatus {
  return value === "DRAFT" || value === "REVIEW" || value === "PUBLISHED";
}
