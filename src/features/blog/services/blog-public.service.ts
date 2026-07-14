import { prisma } from "@/lib/prisma";
import { getBrandingSettings } from "@/features/settings/services/settings.service";
import { tagMatchesFilter } from "@/features/blog/content-processor";

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
  tags: true,
} as const;

const RELATED_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  featuredImageUrl: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  categories: {
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
} as const;

export async function getPublishedBlogPosts(page: number, perPage = 9, tag?: string) {
  const where = { status: "PUBLISHED" as const, slug: { not: "" } };

  if (tag?.trim()) {
    const allPosts = await prisma.blogPost.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: LIST_SELECT,
    });

    const filtered = allPosts.filter((post) => {
      if (!Array.isArray(post.tags)) return false;
      return post.tags.some(
        (entry) => typeof entry === "string" && tagMatchesFilter(entry, tag)
      );
    });

    const total = filtered.length;
    const posts = filtered.slice((page - 1) * perPage, page * perPage);

    return {
      posts: posts.map(({ tags: _tags, ...post }) => post),
      total,
      totalPages: Math.ceil(total / perPage),
      perPage,
      activeTag: tag,
    };
  }

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
    return {
      posts: posts.map(({ tags: _tags, ...post }) => post),
      total,
      totalPages: Math.ceil(total / perPage),
      perPage,
      activeTag: null,
    };
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
    activeTag: null,
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

  if (post) {
    const { resolveBlogFeaturedImageUrl } = await import(
      "@/features/content/services/content-media-assignment.service"
    );
    const featuredFromAssignment = await resolveBlogFeaturedImageUrl({
      id: post.id,
      featuredImageUrl: post.featuredImageUrl,
    });
    return {
      ...post,
      featuredImageUrl: featuredFromAssignment ?? post.featuredImageUrl,
    };
  }

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
    faqJson: [],
    tags: [],
    categories: [],
  };
}

export async function getRelatedBlogPosts(currentSlug: string, categoryIds: string[] = []) {
  const baseWhere = {
    status: "PUBLISHED" as const,
    slug: { not: currentSlug },
  };

  if (categoryIds.length > 0) {
    const sameCategory = await prisma.blogPost.findMany({
      where: {
        ...baseWhere,
        categories: { some: { categoryId: { in: categoryIds } } },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 4,
      select: RELATED_SELECT,
    });

    if (sameCategory.length >= 4) {
      return sameCategory.map(mapRelatedPost);
    }

    const excludeIds = sameCategory.map((post) => post.id);
    const others = await prisma.blogPost.findMany({
      where: {
        ...baseWhere,
        id: { notIn: excludeIds },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 4 - sameCategory.length,
      select: RELATED_SELECT,
    });

    return [...sameCategory, ...others].map(mapRelatedPost);
  }

  const posts = await prisma.blogPost.findMany({
    where: baseWhere,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 4,
    select: RELATED_SELECT,
  });

  if (posts.length > 0) {
    return posts.map(mapRelatedPost);
  }

  const legacy = await prisma.post.findMany({
    where: { status: "PUBLISHED", slug: { not: currentSlug } },
    orderBy: { createdAt: "desc" },
    take: 4,
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
    categories: [],
  }));
}

function mapRelatedPost(post: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  status: "DRAFT" | "REVIEW" | "PUBLISHED";
  categories: { category: { id: string; name: string; slug: string } }[];
}) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    featuredImageUrl: post.featuredImageUrl,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    status: post.status,
    categories: post.categories.map((item) => item.category),
  };
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
    posts: posts.map(({ tags: _tags, ...post }) => post),
    total,
    totalPages: Math.ceil(total / perPage),
    perPage,
  };
}

export async function resolveBlogOgImage(post: {
  id?: string;
  ogImageUrl?: string | null;
  featuredImageUrl?: string | null;
}) {
  if (post.id) {
    const { resolveBlogOgImageFromAssignments } = await import(
      "@/features/content/services/content-media-assignment.service"
    );
    const fromAssignments = await resolveBlogOgImageFromAssignments({
      id: post.id,
      ogImageUrl: post.ogImageUrl,
      featuredImageUrl: post.featuredImageUrl,
    });
    if (fromAssignments) return fromAssignments;
  }
  if (post.ogImageUrl) return post.ogImageUrl;
  if (post.featuredImageUrl) return post.featuredImageUrl;
  const branding = await getBrandingSettings();
  return branding.defaultOgImageUrl ?? process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE ?? null;
}

export type PublicBlogPost = Awaited<ReturnType<typeof getPublishedBlogPostBySlug>>;
