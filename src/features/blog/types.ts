import type { BlogPostStatus } from "@prisma/client";

export type BlogCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  postCount?: number;
};

export type BlogPostRecord = {
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
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  categories: BlogCategoryRecord[];
};

export type BlogPostListItem = Pick<
  BlogPostRecord,
  | "id"
  | "title"
  | "slug"
  | "excerpt"
  | "featuredImageUrl"
  | "status"
  | "publishedAt"
  | "createdAt"
  | "updatedAt"
> & {
  categories: Pick<BlogCategoryRecord, "id" | "name" | "slug">[];
};

export type BlogPostInput = {
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  featuredImageUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogImageUrl?: string | null;
  status?: BlogPostStatus;
  categoryIds?: string[];
};

export const BLOG_POST_STATUSES: BlogPostStatus[] = ["DRAFT", "REVIEW", "PUBLISHED"];

export const BLOG_STATUS_LABELS: Record<BlogPostStatus, string> = {
  DRAFT: "Draft",
  REVIEW: "Review",
  PUBLISHED: "Published",
};
