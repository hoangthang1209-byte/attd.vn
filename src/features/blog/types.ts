export type BlogPostStatus = import("@prisma/client").BlogPostStatus;

export type BlogFaqItem = {
  question: string;
  answer: string;
};

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
  scheduledAt?: string | null;
  lastPublishedAt?: string | null;
  lastUnpublishedAt?: string | null;
  publishedBy?: string | null;
  scheduledBy?: string | null;
  publishVersion?: number;
  lastPublishedContentHash?: string | null;
  publishReadinessAcknowledgedAt?: string | null;
  publishReadinessAcknowledgedBy?: string | null;
  publishAckNote?: string | null;
  needsContentReview?: boolean;
  faqJson: BlogFaqItem[];
  tags: string[];
  mediaBundleId?: string | null;
  sourceWritingDraftId?: string | null;
  sourceWritingDraftVersion?: number | null;
  sourceReviewSessionId?: string | null;
  sourceHandoffRecordId?: string | null;
  contentModifiedAfterHandoff?: boolean;
  lastHandoffAt?: string | null;
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
  faqJson?: BlogFaqItem[];
  tags?: string[];
  aiMetadata?: Record<string, unknown> | null;
};

export const BLOG_POST_STATUSES: BlogPostStatus[] = [
  "DRAFT",
  "REVIEW",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
];

export const BLOG_STATUS_LABELS: Record<BlogPostStatus, string> = {
  DRAFT: "Draft",
  REVIEW: "Review",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};
