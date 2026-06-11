import { prisma } from "@/lib/prisma";

const POST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
  status: true,
} as const;

export async function getPublishedPosts(page: number, perPage = 9) {
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PUBLISHED", slug: { not: "" } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: POST_SELECT,
    }),
    prisma.post.count({ where: { status: "PUBLISHED", slug: { not: "" } } }),
  ]);

  return { posts, total, totalPages: Math.ceil(total / perPage), perPage };
}

export async function getPostBySlug(slug: string) {
  return prisma.post.findUnique({
    where: { slug },
  });
}

export async function getRelatedPosts(currentSlug: string) {
  return prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      slug: { not: currentSlug },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: POST_SELECT,
  });
}

export async function getAllPostsForAdmin() {
  return prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      ...POST_SELECT,
      seoTitle: true,
    },
  });
}

export async function getPostByIdForAdmin(id: string) {
  return prisma.post.findUnique({
    where: { id },
  });
}
