import type { QuoteSourceType, QuoteStatus } from "@prisma/client";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Nháp",
  SENT: "Đã gửi",
  VIEWED: "Khách đã xem",
  ACCEPTED: "Khách đồng ý",
  REJECTED: "Khách từ chối",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã hủy",
};

export const QUOTE_SOURCE_LABELS: Record<QuoteSourceType, string> = {
  MANUAL: "Nhập tay",
  PRICING_CALCULATION: "Từ bản tính giá",
  LEAD: "Từ lead",
  CUSTOMER: "Từ khách hàng",
};

export function getQuoteStatusLabel(status: QuoteStatus): string {
  return QUOTE_STATUS_LABELS[status] ?? status;
}

export function getQuoteSourceLabel(source: QuoteSourceType): string {
  return QUOTE_SOURCE_LABELS[source] ?? source;
}

export function quoteStatusBadgeClass(status: QuoteStatus): string {
  switch (status) {
    case "DRAFT":
      return "admin-kb-badge--low";
    case "SENT":
    case "VIEWED":
      return "admin-kb-badge--medium";
    case "ACCEPTED":
      return "admin-kb-badge--high";
    case "REJECTED":
    case "EXPIRED":
    case "CANCELLED":
      return "admin-kb-badge--danger";
    default:
      return "";
  }
}
