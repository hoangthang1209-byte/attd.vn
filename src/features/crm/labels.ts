import type {
  CRMActivityType,
  CustomerStatus,
  CustomerType,
  LeadPriority,
  LeadSource,
  LeadStatus,
} from "@prisma/client";

export const CRM_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  QUOTING: "Đang báo giá",
  QUALIFIED: "Đã xác định nhu cầu",
  NEED_PRICING: "Cần tính giá",
  QUOTED: "Đã báo giá",
  NEGOTIATING: "Đang thương lượng",
  WON: "Đã chốt",
  LOST: "Mất khách",
  NOT_FIT: "Không phù hợp",
};

/** Fallback labels for unknown/legacy status strings in UI */
const LEGACY_STATUS_LABELS: Record<string, string> = {
  CONTACT: "Đã liên hệ",
};

export function getLeadStatusLabel(status: LeadStatus | string): string {
  if (status in CRM_STATUS_LABELS) {
    return CRM_STATUS_LABELS[status as LeadStatus];
  }
  return LEGACY_STATUS_LABELS[status] ?? status;
}

export const CRM_SOURCE_LABELS: Record<LeadSource, string> = {
  CONTACT: "Liên hệ báo giá",
  DEALER: "Đại lý",
  OEM: "OEM",
  SOURCING: "Nguồn hàng",
  LANDING_PAGE: "Landing page",
  WEBSITE: "Website",
  ZALO: "Zalo",
  FACEBOOK: "Facebook",
  PHONE: "Điện thoại",
  REFERRAL: "Giới thiệu",
  OLD_CUSTOMER: "Khách cũ",
  DIRECT: "Trực tiếp",
  PRODUCT_INQUIRY: "Yêu cầu báo giá sản phẩm",
  OTHER: "Khác",
};

export const CRM_PRIORITY_LABELS: Record<LeadPriority, string> = {
  LOW: "Thấp",
  NORMAL: "Bình thường",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

export function getLeadSourceLabel(source: LeadSource | string): string {
  if (source in CRM_SOURCE_LABELS) {
    return CRM_SOURCE_LABELS[source as LeadSource];
  }
  return source;
}

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  DEALER: "Đại lý",
  AGENCY: "Agency",
  PRINTER: "Xưởng in/thêu",
  EVENT_COMPANY: "Công ty sự kiện",
  BUSINESS: "Doanh nghiệp",
  RETAIL: "Khách lẻ",
  SUPPLIER: "Nhà cung cấp",
  OTHER: "Khác",
};

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  PROSPECT: "Tiềm năng",
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngưng hoạt động",
  VIP: "Khách quan trọng",
  BLACKLISTED: "Không phục vụ",
};

export const CRM_ACTIVITY_TYPE_LABELS: Record<CRMActivityType, string> = {
  CALL: "Gọi điện",
  ZALO: "Zalo",
  EMAIL: "Email",
  MEETING: "Gặp mặt",
  NOTE: "Ghi chú",
  FOLLOW_UP: "Follow-up",
  QUOTE_REQUEST: "Yêu cầu báo giá",
  SAMPLE_REQUEST: "Yêu cầu mẫu",
  STATUS_CHANGE: "Đổi trạng thái",
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
      return "WEBSITE";
    case "CONTACT_FORM":
      return "CONTACT";
    case "ZALO":
      return "ZALO";
    case "FACEBOOK":
      return "FACEBOOK";
    case "PHONE":
      return "PHONE";
    default:
      if (formSource.includes("OEM")) return "OEM";
      if (formSource.includes("DEALER")) return "DEALER";
      if (formSource.includes("WHOLESALE") || formSource.includes("SOURC")) {
        return "SOURCING";
      }
      return "WEBSITE";
  }
}

export function displayLeadContactName(lead: {
  contactName?: string | null;
  fullName: string;
}): string {
  return lead.contactName?.trim() || lead.fullName;
}

export function displayLeadCompanyName(lead: {
  companyName?: string | null;
  company?: string | null;
}): string | null {
  return lead.companyName?.trim() || lead.company?.trim() || null;
}
