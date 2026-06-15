import type {
  KnowledgeBaseEntryStatus,
  KnowledgeBaseEntryType,
  KnowledgeBasePriority,
  KnowledgeBaseSourceType,
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
  tags: string[];
  relatedProductIds: string[];
  relatedLandingPageSlugs: string[];
  relatedBlogPostIds: string[];
  usageScope: string[];
  isFeatured: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  completenessScore?: number;
  completenessLabel?: string;
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
  relatedProductIds?: string[];
  relatedLandingPageSlugs?: string[];
  relatedBlogPostIds?: string[];
  usageScope?: string[];
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
};

export type KnowledgeBaseKpis = {
  totalEntries: number;
  activeEntries: number;
  verifiedEntries: number;
  draftEntries: number;
  highPriorityEntries: number;
  aiReadyScore: number;
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

export type { KnowledgeBaseEntryType, KnowledgeBaseEntryStatus, KnowledgeBasePriority, KnowledgeBaseSourceType };
