import type {
  KnowledgeBaseEntryStatus,
  KnowledgeBaseEntryType,
  KnowledgeBasePriority,
} from "@prisma/client";
import { toSlug } from "@/lib/slug";

export function generateKnowledgeBaseSlug(title: string): string {
  return toSlug(title.trim()) || "knowledge-entry";
}

export function normalizeKnowledgeBaseTags(tags: string[] | string | undefined): string[] {
  if (!tags) return [];
  const list = Array.isArray(tags) ? tags : tags.split(",");
  return [...new Set(list.map((t) => t.trim()).filter(Boolean))];
}

export function getEntryTypeLabel(type: KnowledgeBaseEntryType): string {
  const labels: Record<KnowledgeBaseEntryType, string> = {
    COMPANY: "Thông tin công ty",
    PRODUCT: "Sản phẩm",
    MATERIAL: "Chất liệu",
    MANUFACTURING: "Sản xuất",
    OEM: "OEM",
    WHOLESALE: "Bán sỉ",
    DEALER: "Đại lý",
    PRICING: "Giá & MOQ",
    POLICY: "Chính sách",
    CASE_STUDY: "Case study",
    FAQ: "FAQ",
    SALES_SCRIPT: "Kịch bản sales",
    SEO_CONTEXT: "SEO context",
    BRAND_VOICE: "Brand voice",
    LOGISTICS: "Giao hàng & logistics",
    QUALITY_CONTROL: "QC",
    CUSTOMER_SEGMENT: "Phân khúc khách",
    COMPETITOR_NOTE: "Ghi chú đối thủ",
  };
  return labels[type] ?? type;
}

export function getEntryStatusLabel(status: KnowledgeBaseEntryStatus): string {
  const labels: Record<KnowledgeBaseEntryStatus, string> = {
    DRAFT: "Nháp",
    ACTIVE: "Đang dùng",
    ARCHIVED: "Lưu trữ",
  };
  return labels[status] ?? status;
}

export function getPriorityLabel(priority: KnowledgeBasePriority): string {
  const labels: Record<KnowledgeBasePriority, string> = {
    HIGH: "Cao",
    MEDIUM: "Trung bình",
    LOW: "Thấp",
  };
  return labels[priority] ?? priority;
}

export function getCompletenessLabel(score: number): string {
  if (score >= 90) return "Sẵn sàng cho AI";
  if (score >= 70) return "Khá đầy đủ";
  if (score >= 40) return "Tạm dùng được";
  return "Cần bổ sung";
}

export function calculateKnowledgeCompleteness(entry: {
  title: string;
  summary: string | null;
  content: string | null;
  structuredData: Record<string, unknown> | null;
  tags: string[];
  usageScope: string[];
  isVerified: boolean;
}): number {
  let score = 0;
  if (entry.title.trim()) score += 15;
  if (entry.summary?.trim()) score += 15;
  if (entry.content?.trim() && entry.content.trim().length >= 80) score += 25;
  if (entry.structuredData && Object.keys(entry.structuredData).length > 0) score += 15;
  if (entry.tags.length > 0) score += 10;
  if (entry.usageScope.length > 0) score += 10;
  if (entry.isVerified) score += 10;
  return Math.min(100, score);
}
