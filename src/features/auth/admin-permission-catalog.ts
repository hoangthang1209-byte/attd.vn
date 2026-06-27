export type PermissionCatalogEntry = {
  code: string;
  module: string;
  action: string;
  name: string;
  description?: string;
  sortOrder: number;
};

export const ADMIN_PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  { code: "dashboard.view", module: "DASHBOARD", action: "VIEW", name: "Xem tổng quan", sortOrder: 10 },
  { code: "crm.view", module: "CRM", action: "VIEW", name: "Xem CRM", sortOrder: 20 },
  { code: "customers.view", module: "CUSTOMERS", action: "VIEW", name: "Xem khách hàng", sortOrder: 30 },
  { code: "customers.create", module: "CUSTOMERS", action: "CREATE", name: "Tạo khách hàng", sortOrder: 31 },
  { code: "customers.update", module: "CUSTOMERS", action: "UPDATE", name: "Cập nhật khách hàng", sortOrder: 32 },
  { code: "leads.view", module: "LEADS", action: "VIEW", name: "Xem lead", sortOrder: 40 },
  { code: "leads.create", module: "LEADS", action: "CREATE", name: "Tạo lead", sortOrder: 41 },
  { code: "leads.update", module: "LEADS", action: "UPDATE", name: "Cập nhật lead", sortOrder: 42 },
  { code: "quotes.view", module: "QUOTES", action: "VIEW", name: "Xem báo giá", sortOrder: 50 },
  { code: "quotes.create", module: "QUOTES", action: "CREATE", name: "Tạo báo giá", sortOrder: 51 },
  { code: "quotes.update", module: "QUOTES", action: "UPDATE", name: "Cập nhật báo giá", sortOrder: 52 },
  { code: "pricing.manage", module: "PRICING", action: "MANAGE", name: "Quản lý tính giá", sortOrder: 60 },
  { code: "orders.view", module: "ORDERS", action: "VIEW", name: "Xem đơn hàng", sortOrder: 70 },
  { code: "orders.create", module: "ORDERS", action: "CREATE", name: "Tạo đơn hàng", sortOrder: 71 },
  { code: "orders.update", module: "ORDERS", action: "UPDATE", name: "Cập nhật đơn hàng", sortOrder: 72 },
  { code: "orders.delete", module: "ORDERS", action: "DELETE", name: "Xóa đơn hàng", sortOrder: 73 },
  { code: "orders.assign", module: "ORDERS", action: "ASSIGN", name: "Phân công đơn hàng", sortOrder: 74 },
  {
    code: "orders.view_financials",
    module: "ORDER_FINANCIALS",
    action: "VIEW_FINANCIALS",
    name: "Xem thông tin tài chính đơn hàng",
    sortOrder: 75,
  },
  { code: "production.view", module: "PRODUCTION", action: "VIEW", name: "Xem sản xuất", sortOrder: 80 },
  { code: "production.update", module: "PRODUCTION", action: "UPDATE", name: "Cập nhật sản xuất", sortOrder: 81 },
  { code: "qc.update", module: "QC", action: "UPDATE", name: "Cập nhật QC", sortOrder: 90 },
  { code: "warehouse.view", module: "WAREHOUSE", action: "VIEW", name: "Xem kho", sortOrder: 100 },
  { code: "warehouse.adjust", module: "WAREHOUSE", action: "UPDATE", name: "Điều chỉnh kho", sortOrder: 101 },
  { code: "purchasing.view", module: "PURCHASING", action: "VIEW", name: "Xem mua hàng", sortOrder: 110 },
  { code: "delivery.view", module: "DELIVERY", action: "VIEW", name: "Xem giao hàng", sortOrder: 120 },
  { code: "delivery.update", module: "DELIVERY", action: "UPDATE", name: "Cập nhật giao hàng", sortOrder: 121 },
  { code: "payments.view", module: "PAYMENTS", action: "VIEW", name: "Xem thanh toán", sortOrder: 130 },
  { code: "payments.manage", module: "PAYMENTS", action: "MANAGE", name: "Quản lý thanh toán", sortOrder: 131 },
  { code: "media.view", module: "MEDIA", action: "VIEW", name: "Xem media", sortOrder: 140 },
  { code: "media.manage", module: "MEDIA", action: "MANAGE", name: "Quản lý media", sortOrder: 141 },
  { code: "products.view", module: "PRODUCTS", action: "VIEW", name: "Xem sản phẩm", sortOrder: 150 },
  { code: "products.manage", module: "PRODUCTS", action: "MANAGE", name: "Quản lý sản phẩm", sortOrder: 151 },
  { code: "categories.manage", module: "CATEGORIES", action: "MANAGE", name: "Quản lý danh mục", sortOrder: 160 },
  {
    code: "revenue_categories.manage",
    module: "REVENUE_CATEGORIES",
    action: "MANAGE",
    name: "Quản lý nhóm doanh thu",
    sortOrder: 170,
  },
  { code: "employees.manage", module: "EMPLOYEES", action: "MANAGE", name: "Quản lý nhân viên", sortOrder: 180 },
  {
    code: "roles_permissions.manage",
    module: "ROLES_PERMISSIONS",
    action: "MANAGE",
    name: "Quản lý vai trò & quyền",
    sortOrder: 190,
  },
  { code: "users.manage", module: "SETTINGS", action: "MANAGE", name: "Quản lý tài khoản", sortOrder: 195 },
  { code: "cms.manage", module: "CMS", action: "MANAGE", name: "Quản lý nội dung CMS", sortOrder: 200 },
  { code: "reports.view", module: "REPORTS", action: "VIEW", name: "Xem báo cáo", sortOrder: 210 },
  { code: "settings.manage", module: "SETTINGS", action: "MANAGE", name: "Quản lý cài đặt", sortOrder: 220 },
];

export const ALL_PERMISSION_CODES = ADMIN_PERMISSION_CATALOG.map((p) => p.code);
