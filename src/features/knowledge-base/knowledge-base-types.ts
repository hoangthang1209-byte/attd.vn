import type {
  KnowledgeBaseClaimStatus,
  KnowledgeBaseConfidence,
  KnowledgeBaseEntryStatus,
  KnowledgeBaseEntryType,
  KnowledgeBasePriority,
  KnowledgeBaseSourceType,
  KnowledgeBaseVisibility,
} from "@prisma/client";

export type KnowledgeBaseUsageScope =
  | "BLOG_AI"
  | "LANDING_PAGE_AI"
  | "PRODUCT_AI"
  | "SEO_PLANNING"
  | "CRM"
  | "SALES"
  | "DEALER_PORTAL"
  | "PUBLIC_FAQ"
  | "INTERNAL_ONLY";

export const KNOWLEDGE_USAGE_SCOPES: {
  id: KnowledgeBaseUsageScope;
  label: string;
}[] = [
  { id: "BLOG_AI", label: "Dùng cho AI viết blog" },
  { id: "LANDING_PAGE_AI", label: "Dùng cho landing page" },
  { id: "PRODUCT_AI", label: "Dùng cho mô tả sản phẩm" },
  { id: "SEO_PLANNING", label: "Dùng cho SEO Planning" },
  { id: "CRM", label: "Dùng cho CRM" },
  { id: "SALES", label: "Dùng cho đội sales" },
  { id: "DEALER_PORTAL", label: "Dùng cho đại lý" },
  { id: "PUBLIC_FAQ", label: "FAQ công khai" },
  { id: "INTERNAL_ONLY", label: "Nội bộ" },
];

export type KnowledgeBaseCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  entryCount?: number;
};

export type KnowledgeBaseEntryRecord = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  structuredData: Record<string, unknown> | null;
  categoryId: string;
  category?: Pick<KnowledgeBaseCategoryRecord, "id" | "name" | "slug">;
  type: KnowledgeBaseEntryType;
  status: KnowledgeBaseEntryStatus;
  priority: KnowledgeBasePriority;
  sourceId: string | null;
  source?: {
    id: string;
    name: string;
    url: string | null;
    type: KnowledgeBaseSourceType;
    note: string | null;
  } | null;
  tags: string[];
  aliases: string[];
  relatedProductIds: string[];
  relatedLandingPageSlugs: string[];
  relatedBlogPostIds: string[];
  relatedMediaBundleIds: string[];
  relatedSeoTopicIds: string[];
  relatedEntryIds: string[];
  usageScope: string[];
  visibility: KnowledgeBaseVisibility;
  claimStatus: KnowledgeBaseClaimStatus;
  confidence: KnowledgeBaseConfidence;
  language: string;
  domain: string | null;
  ownerId: string | null;
  authorName: string | null;
  evidenceUrl: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  lastVerifiedAt: string | null;
  version: number;
  reviewIntervalDays?: number | null;
  nextReviewAt?: string | null;
  expiresAt?: string | null;
  isFeatured: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  completenessScore?: number;
  completenessLabel?: string;
  aiReadiness?: {
    score: number;
    level: import("@/features/knowledge-base/knowledge-base-ai-readiness").AiReadinessLevel;
    label: string;
    reasons: string[];
    missing: string[];
  };
};

export type KnowledgeBaseEntryInput = {
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  structuredData?: Record<string, unknown> | null;
  categoryId: string;
  type: KnowledgeBaseEntryType;
  status?: KnowledgeBaseEntryStatus;
  priority?: KnowledgeBasePriority;
  sourceId?: string | null;
  tags?: string[];
  aliases?: string[];
  relatedProductIds?: string[];
  relatedLandingPageSlugs?: string[];
  relatedBlogPostIds?: string[];
  relatedMediaBundleIds?: string[];
  relatedSeoTopicIds?: string[];
  relatedEntryIds?: string[];
  usageScope?: string[];
  visibility?: KnowledgeBaseVisibility;
  claimStatus?: KnowledgeBaseClaimStatus;
  confidence?: KnowledgeBaseConfidence;
  language?: string;
  domain?: string | null;
  ownerId?: string | null;
  authorName?: string | null;
  evidenceUrl?: string | null;
  /** Never set via generic save — use approve/revoke APIs. */
  approvedBy?: string | null;
  reviewIntervalDays?: number | null;
  nextReviewAt?: string | Date | null;
  expiresAt?: string | Date | null;
  isFeatured?: boolean;
  isVerified?: boolean;
};

export type KnowledgeBaseContextPreviewInput = {
  keyword?: string;
  blueprintId?: string;
  usageScope?: string;
  entryIds?: string[];
  maxEntries?: number;
  verifiedOnly?: boolean;
};

export type KnowledgeBaseContextPreviewResult = {
  selectedEntries: KnowledgeBaseEntryRecord[];
  contextText: string;
  warnings: string[];
  completenessScore: number;
  completenessLabel: string;
  verifiedCount: number;
  unverifiedCount: number;
  missingKnowledge: string[];
};

export type KnowledgeBaseKpis = {
  totalEntries: number;
  activeEntries: number;
  verifiedEntries: number;
  draftEntries: number;
  highPriorityEntries: number;
  aiReadyScore: number;
  verifiedPercent: number;
  aiReadyPercent: number;
  missingDataCount: number;
  lastImportAt: string | null;
  lastImportFilename: string | null;
  entriesAddedThisWeek: number;
};

export type KnowledgeReadinessResult = {
  score: number;
  label: string;
  productData: number;
  oemData: number;
  dealerData: number;
  policyData: number;
  warnings: string[];
};

export type { KnowledgeBaseEntryType, KnowledgeBaseEntryStatus, KnowledgeBasePriority, KnowledgeBaseSourceType, KnowledgeBaseVisibility, KnowledgeBaseClaimStatus, KnowledgeBaseConfidence };
