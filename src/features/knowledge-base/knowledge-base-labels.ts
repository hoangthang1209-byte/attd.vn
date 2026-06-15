import type {
  KnowledgeBaseEntryStatus,
  KnowledgeBaseEntryType,
  KnowledgeBasePriority,
} from "@prisma/client";

export const ENTRY_TYPE_OPTIONS: KnowledgeBaseEntryType[] = [
  "COMPANY",
  "PRODUCT",
  "MATERIAL",
  "MANUFACTURING",
  "OEM",
  "WHOLESALE",
  "DEALER",
  "PRICING",
  "POLICY",
  "CASE_STUDY",
  "FAQ",
  "SALES_SCRIPT",
  "SEO_CONTEXT",
  "BRAND_VOICE",
  "LOGISTICS",
  "QUALITY_CONTROL",
  "CUSTOMER_SEGMENT",
  "COMPETITOR_NOTE",
];

export const FILTER_ENTRY_TYPES: KnowledgeBaseEntryType[] = [
  "COMPANY",
  "PRODUCT",
  "OEM",
  "DEALER",
  "POLICY",
  "LOGISTICS",
  "BRAND_VOICE",
  "SEO_CONTEXT",
  "FAQ",
  "CASE_STUDY",
];

export function getEntryTypeLabel(type: KnowledgeBaseEntryType): string {
  const labels: Record<KnowledgeBaseEntryType, string> = {
    COMPANY: "Thông tin công ty",
    PRODUCT: "Sản phẩm",
    MATERIAL: "Chất liệu",
    MANUFACTURING: "Sản xuất",
    OEM: "OEM / Sản xuất theo yêu cầu",
    WHOLESALE: "Bán sỉ",
    DEALER: "Đại lý",
    PRICING: "Giá & MOQ",
    POLICY: "Chính sách",
    CASE_STUDY: "Case study",
    FAQ: "Câu hỏi thường gặp",
    SALES_SCRIPT: "Kịch bản tư vấn bán hàng",
    SEO_CONTEXT: "Ngữ cảnh SEO",
    BRAND_VOICE: "Giọng thương hiệu",
    LOGISTICS: "Giao hàng & logistics",
    QUALITY_CONTROL: "Kiểm soát chất lượng",
    CUSTOMER_SEGMENT: "Phân khúc khách hàng",
    COMPETITOR_NOTE: "Ghi chú đối thủ",
  };
  return labels[type] ?? type;
}

export function getEntryStatusLabel(status: KnowledgeBaseEntryStatus): string {
  const labels: Record<KnowledgeBaseEntryStatus, string> = {
    DRAFT: "Nháp",
    ACTIVE: "Đang sử dụng",
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
