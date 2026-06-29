import type {
  DealerRFQArtworkStatus,
  DealerRFQPriority,
  DealerRFQProjectType,
  DealerRFQStatus,
} from "@prisma/client";

export const DEALER_RFQ_PROJECT_TYPES: DealerRFQProjectType[] = [
  "BLANK_APPAREL",
  "UNIFORM",
  "CORPORATE_GIFT",
  "EVENT_MERCH",
  "OEM_PRIVATE_LABEL",
  "PRINT_SERVICE",
  "SAMPLE",
  "OTHER",
];

export const DEALER_RFQ_STATUSES: DealerRFQStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "REVIEWING",
  "NEED_MORE_INFO",
  "PRICING",
  "QUOTED",
  "WON",
  "LOST",
  "CANCELLED",
];

export const DEALER_RFQ_PRIORITIES: DealerRFQPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

export const DEALER_RFQ_ARTWORK_STATUSES: DealerRFQArtworkStatus[] = [
  "NOT_PROVIDED",
  "PROVIDED",
  "NEED_REVIEW",
  "APPROVED",
  "REVISION_REQUIRED",
];

export const DEALER_RFQ_PROJECT_TYPE_LABELS: Record<DealerRFQProjectType, string> = {
  BLANK_APPAREL: "Áo trơn / blank",
  UNIFORM: "Đồng phục",
  CORPORATE_GIFT: "Quà tặng doanh nghiệp",
  EVENT_MERCH: "Merch sự kiện",
  OEM_PRIVATE_LABEL: "OEM / private label",
  PRINT_SERVICE: "Dịch vụ in",
  SAMPLE: "Đặt mẫu",
  OTHER: "Khác",
};

export const DEALER_RFQ_STATUS_LABELS: Record<DealerRFQStatus, string> = {
  DRAFT: "Nháp",
  SUBMITTED: "Đã gửi",
  REVIEWING: "Đang xem xét",
  NEED_MORE_INFO: "Cần bổ sung",
  PRICING: "Đang báo giá",
  QUOTED: "Đã báo giá",
  WON: "Thành công",
  LOST: "Không đạt",
  CANCELLED: "Đã hủy",
};

export const DEALER_RFQ_PRIORITY_LABELS: Record<DealerRFQPriority, string> = {
  LOW: "Thấp",
  NORMAL: "Bình thường",
  HIGH: "Cao",
  URGENT: "Khẩn",
};

export const DEALER_RFQ_ARTWORK_STATUS_LABELS: Record<DealerRFQArtworkStatus, string> = {
  NOT_PROVIDED: "Chưa có",
  PROVIDED: "Đã gửi",
  NEED_REVIEW: "Cần duyệt",
  APPROVED: "Đã duyệt",
  REVISION_REQUIRED: "Cần chỉnh sửa",
};

export type DealerRFQItemInput = {
  id?: string;
  productId?: string | null;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  skuSnapshot?: string | null;
  colorSnapshot?: string | null;
  quantity: number;
  decorationType?: string | null;
  position?: string | null;
  note?: string | null;
};

export type DealerRFQItemRecord = {
  id: string;
  rfqId: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  skuSnapshot: string | null;
  colorSnapshot: string | null;
  quantity: number;
  decorationType: string | null;
  position: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DealerRFQRecord = {
  id: string;
  code: string;
  dealerCompanyId: string;
  dealerUserId: string | null;
  customerId: string | null;
  leadId: string | null;
  quoteId: string | null;
  pricingCalculationId: string | null;
  title: string;
  projectType: DealerRFQProjectType;
  status: DealerRFQStatus;
  priority: DealerRFQPriority;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  companyName: string | null;
  productSummary: string | null;
  quantity: number | null;
  targetBudget: string | null;
  deadline: string | null;
  deliveryLocation: string | null;
  artworkStatus: DealerRFQArtworkStatus;
  artworkUrls: string[] | null;
  note: string | null;
  internalNote: string | null;
  assignedToAdminUserId: string | null;
  submittedAt: string | null;
  quotedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: DealerRFQItemRecord[];
  dealerCompany?: { id: string; name: string; code: string };
  dealerUser?: { id: string; name: string; email: string } | null;
  customer?: { id: string; name: string; code: string } | null;
  lead?: { id: string; code: string | null } | null;
};

export type CreateDealerRFQInput = {
  dealerCompanyId: string;
  dealerUserId?: string | null;
  title: string;
  projectType?: DealerRFQProjectType;
  priority?: DealerRFQPriority;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  companyName?: string | null;
  productSummary?: string | null;
  quantity?: number | null;
  targetBudget?: number | string | null;
  deadline?: string | Date | null;
  deliveryLocation?: string | null;
  artworkStatus?: DealerRFQArtworkStatus;
  artworkUrls?: string[] | null;
  note?: string | null;
  items?: DealerRFQItemInput[];
  submit?: boolean;
};

export type UpdateDealerRFQInput = Partial<
  Omit<CreateDealerRFQInput, "dealerCompanyId" | "dealerUserId" | "submit">
> & {
  internalNote?: string | null;
  assignedToAdminUserId?: string | null;
};

export type ListDealerRFQsFilters = {
  search?: string;
  status?: DealerRFQStatus;
  priority?: DealerRFQPriority;
  projectType?: DealerRFQProjectType;
  dealerCompanyId?: string;
  limit?: number;
};

export type DealerRFQSummary = {
  submitted: number;
  inProgress: number;
  quoted: number;
  needInfo: number;
};
