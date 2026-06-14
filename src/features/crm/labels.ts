import type { LeadSource, LeadStatus } from "@prisma/client";

export const CRM_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Lead mới",
  CONTACTED: "Đã liên hệ",
  QUOTING: "Đang báo giá",
  NEGOTIATING: "Đàm phán",
  WON: "Thành công",
  LOST: "Thất bại",
};

export const CRM_SOURCE_LABELS: Record<LeadSource, string> = {
  CONTACT: "Liên hệ báo giá",
  DEALER: "Đăng ký đại lý",
  OEM: "OEM",
  SOURCING: "Nguồn hàng",
  LANDING_PAGE: "Landing page",
};

export function mapFormSourceToCrmSource(formSource: string): LeadSource {
  switch (formSource) {
    case "DEALER_FORM":
      return "DEALER";
    case "OEM_PAGE":
      return "OEM";
    case "WHOLESALE_PAGE":
      return "SOURCING";
    case "CORPORATE_GIFTS_PAGE":
    case "WEBSITE":
      return "LANDING_PAGE";
    case "CONTACT_FORM":
      return "CONTACT";
    default:
      if (formSource.includes("OEM")) return "OEM";
      if (formSource.includes("DEALER")) return "DEALER";
      if (formSource.includes("WHOLESALE") || formSource.includes("SOURC")) {
        return "SOURCING";
      }
      return "LANDING_PAGE";
  }
}
