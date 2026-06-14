import { prisma } from "@/lib/prisma";
import { getBrandingSettings } from "@/features/settings/services/settings.service";

const LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  featuredImageUrl: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  status: true,
} as const;

export async function getPublishedBlogPosts(page: number, perPage = 9) {
  const where = { status: "PUBLISHED" as const, slug: { not: "" } };
  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: LIST_SELECT,
    }),
    prisma.blogPost.count({ where }),
  ]);

  if (total > 0) {
    return { posts, total, totalPages: Math.ceil(total / perPage), perPage };
  }

  const [legacyPosts, legacyTotal] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PUBLISHED", slug: { not: "" } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        status: true,
      },
    }),
    prisma.post.count({ where: { status: "PUBLISHED", slug: { not: "" } } }),
  ]);

  return {
    posts: legacyPosts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      featuredImageUrl: post.imageUrl,
      publishedAt: post.createdAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      status: "PUBLISHED" as const,
    })),
    total: legacyTotal,
    totalPages: Math.ceil(legacyTotal / perPage),
    perPage,
  };
}

export async function getPublishedBlogPostBySlug(slug: string) {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      categories: {
        where: { category: { isVisible: true } },
        include: { category: true },
      },
    },
  });

  if (post) return post;

  const legacy = await prisma.post.findUnique({ where: { slug } });
  if (!legacy || legacy.status !== "PUBLISHED") return null;

  return {
    id: legacy.id,
    title: legacy.title,
    slug: legacy.slug,
    excerpt: legacy.excerpt,
    content: legacy.content,
    featuredImageUrl: legacy.imageUrl,
    metaTitle: legacy.seoTitle,
    metaDescription: legacy.seoDescription,
    canonicalUrl: null,
    ogImageUrl: null,
    status: "PUBLISHED" as const,
    publishedAt: legacy.createdAt,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    categories: [],
  };
}

export async function getRelatedBlogPosts(currentSlug: string) {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", slug: { not: currentSlug } },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: LIST_SELECT,
  });

  if (posts.length > 0) return posts;

  const legacy = await prisma.post.findMany({
    where: { status: "PUBLISHED", slug: { not: currentSlug } },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
      status: true,
    },
  });

  return legacy.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    featuredImageUrl: post.imageUrl,
    publishedAt: post.createdAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    status: "PUBLISHED" as const,
  }));
}

export async function getPublishedPostsByCategorySlug(
  categorySlug: string,
  page: number,
  perPage = 9
) {
  const category = await prisma.blogCategory.findFirst({
    where: { slug: categorySlug, isVisible: true },
  });
  if (!category) return null;

  const where = {
    status: "PUBLISHED" as const,
    slug: { not: "" },
    categories: { some: { categoryId: category.id } },
  };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: LIST_SELECT,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    category,
    posts,
    total,
    totalPages: Math.ceil(total / perPage),
    perPage,
  };
}

export async function resolveBlogOgImage(post: {
  ogImageUrl?: string | null;
  featuredImageUrl?: string | null;
}) {
  if (post.ogImageUrl) return post.ogImageUrl;
  if (post.featuredImageUrl) return post.featuredImageUrl;
  const branding = await getBrandingSettings();
  return branding.defaultOgImageUrl ?? process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE ?? null;
}

export type PublicBlogPost = Awaited<ReturnType<typeof getPublishedBlogPostBySlug>>;
