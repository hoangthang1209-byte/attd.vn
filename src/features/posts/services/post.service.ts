import { prisma } from "@/lib/prisma";

export {
  getPublishedBlogPosts as getPublishedPosts,
  getPublishedBlogPostBySlug as getPostBySlug,
  getRelatedBlogPosts as getRelatedPosts,
} from "@/features/blog/services/blog-public.service";

/** @deprecated Legacy admin — use blog CMS at /admin/blog */
export async function getAllPostsForAdmin() {
  return prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      imageUrl: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      seoTitle: true,
    },
  });
}

/** @deprecated Legacy admin — use blog CMS at /admin/blog */
export async function getPostByIdForAdmin(id: string) {
  return prisma.post.findUnique({ where: { id } });
}
