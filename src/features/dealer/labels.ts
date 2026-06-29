import type {
  DealerActivityType,
  DealerCompanyStatus,
  DealerCompanyType,
  DealerLevel,
  DealerUserRole,
  DealerUserStatus,
} from "@prisma/client";

export const DEALER_COMPANY_TYPE_LABELS: Record<DealerCompanyType, string> = {
  DEALER: "Đại lý",
  AGENCY: "Agency",
  PRINTING_COMPANY: "Công ty in ấn",
  EVENT_COMPANY: "Công ty sự kiện",
  CORPORATE_BUYER: "Khách hàng doanh nghiệp",
  OEM_CLIENT: "Khách OEM",
  OTHER: "Khác",
};

export const DEALER_COMPANY_STATUS_LABELS: Record<DealerCompanyStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  SUSPENDED: "Tạm ngưng",
};

export const DEALER_LEVEL_LABELS: Record<DealerLevel, string> = {
  STANDARD: "Tiêu chuẩn",
  SILVER: "Bạc",
  GOLD: "Vàng",
  PLATINUM: "Bạch kim",
  DIAMOND: "Kim cương",
};

export const DEALER_USER_ROLE_LABELS: Record<DealerUserRole, string> = {
  OWNER: "Chủ tài khoản",
  MANAGER: "Quản lý",
  SALES: "Kinh doanh",
  PURCHASING: "Mua hàng",
  VIEWER: "Xem",
};

export const DEALER_USER_STATUS_LABELS: Record<DealerUserStatus, string> = {
  INVITED: "Đã mời",
  ACTIVE: "Hoạt động",
  DISABLED: "Vô hiệu",
};

export const DEALER_ACTIVITY_TYPE_LABELS: Record<DealerActivityType, string> = {
  CREATED: "Tạo mới",
  UPDATED: "Cập nhật",
  APPROVED: "Duyệt",
  REJECTED: "Từ chối",
  USER_ADDED: "Thêm người dùng",
  CRM_LINKED: "Liên kết CRM",
  PRICE_GROUP_ASSIGNED: "Gán nhóm giá",
  NOTE_ADDED: "Ghi chú",
};
