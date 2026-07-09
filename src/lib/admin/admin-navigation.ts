import type { AdminPermissionFlags } from "@/components/admin/AdminPermissionsContext";

export type AdminNavStatus = "active" | "coming-soon" | "hidden";
export type AdminPermissionKey = keyof AdminPermissionFlags;

export type AdminNavigationItem = {
  label: string;
  href?: string;
  status: AdminNavStatus;
  requiredPermissions?: AdminPermissionKey[];
};

export type AdminNavigationPlatform = {
  label: string;
  items: AdminNavigationItem[];
  requiredPermissions?: AdminPermissionKey[];
};

export type AdminNavigationSection = {
  label: string;
  icon: string;
  platforms: AdminNavigationPlatform[];
};

export const adminDashboardNavItem: AdminNavigationItem = {
  label: "Dashboard",
  href: "/admin/dashboard",
  status: "active",
  requiredPermissions: ["canViewDashboard"],
};

export const adminNavigationSections: AdminNavigationSection[] = [
  {
    label: "KINH DOANH",
    icon: "💼",
    platforms: [
      {
        label: "CRM Platform",
        requiredPermissions: ["canViewCrm"],
        items: [
          { label: "Lead", href: "/admin/crm/leads", status: "active" },
          { label: "Khách hàng", href: "/admin/crm/customers", status: "active" },
          { label: "Người liên hệ", status: "coming-soon" },
          { label: "Pipeline", href: "/admin/crm", status: "active" },
          { label: "Hoạt động", status: "coming-soon" },
          { label: "Follow-up", status: "coming-soon" },
          { label: "Sample Tracking", status: "coming-soon" },
        ],
      },
      {
        label: "Commercial Platform",
        items: [
          { label: "Pricing Engine", href: "/admin/pricing", status: "active", requiredPermissions: ["canAccessPricing"] },
          { label: "Follow-up", href: "/admin/sales/follow-up", status: "active", requiredPermissions: ["canAccessQuotes"] },
          { label: "Pipeline bán hàng", href: "/admin/sales/pipeline", status: "active", requiredPermissions: ["canAccessQuotes"] },
          { label: "Báo giá", href: "/admin/quotes", status: "active", requiredPermissions: ["canAccessQuotes"] },
          { label: "Đơn hàng", href: "/admin/orders", status: "active", requiredPermissions: ["canViewOrders"] },
          { label: "Lệnh sản xuất", href: "/admin/production", status: "active", requiredPermissions: ["canViewProduction"] },
          { label: "Giao hàng", href: "/admin/delivery", status: "active", requiredPermissions: ["canViewDelivery"] },
          { label: "Thanh toán", status: "coming-soon", requiredPermissions: ["canViewFinancials"] },
          { label: "Hóa đơn", status: "coming-soon", requiredPermissions: ["canViewFinancials"] },
          { label: "Margin", status: "coming-soon", requiredPermissions: ["canViewFinancials"] },
          { label: "Commission", status: "coming-soon", requiredPermissions: ["canViewFinancials"] },
        ],
      },
      {
        label: "Dealer Platform",
        requiredPermissions: ["canViewCrm"],
        items: [
          { label: "Công ty đại lý", href: "/admin/dealer", status: "active" },
          { label: "Tài khoản đại lý", href: "/admin/dealer", status: "active" },
          { label: "RFQ", href: "/admin/dealer/rfqs", status: "active" },
          { label: "Bảng giá đại lý", href: "/admin/pricing/price-groups", status: "active", requiredPermissions: ["canAccessPricing"] },
          { label: "Chính sách đại lý", status: "coming-soon" },
          { label: "Hỗ trợ đại lý", status: "coming-soon" },
        ],
      },
    ],
  },
  {
    label: "SẢN PHẨM",
    icon: "📦",
    platforms: [
      {
        label: "Product Platform",
        items: [
          { label: "Sản phẩm", href: "/admin/products", status: "active", requiredPermissions: ["canManageProducts"] },
          { label: "Danh mục", href: "/admin/danh-muc", status: "active", requiredPermissions: ["canManageProducts"] },
          { label: "SKU / Biến thể", href: "/admin/variant", status: "active", requiredPermissions: ["canManageProducts"] },
          { label: "Thuộc tính", href: "/admin/attributes", status: "active", requiredPermissions: ["canManageProducts"] },
          { label: "Thư viện ảnh", href: "/admin/media", status: "active", requiredPermissions: ["canManageProducts"] },
          { label: "Bảng giá", href: "/admin/pricing/product-tiers", status: "active", requiredPermissions: ["canAccessPricing"] },
          { label: "Tồn kho", href: "/admin/materials/warehouse", status: "active", requiredPermissions: ["canViewWarehouse"] },
          { label: "Import / Export", href: "/admin/products/import", status: "active", requiredPermissions: ["canManageProducts"] },
        ],
      },
      {
        label: "Manufacturing Platform",
        items: [
          { label: "Vật liệu", href: "/admin/production-materials", status: "active", requiredPermissions: ["canViewProduction"] },
          { label: "Phụ liệu", href: "/admin/trims", status: "active", requiredPermissions: ["canViewProduction"] },
          { label: "Nhà cung cấp", href: "/admin/production-suppliers", status: "active", requiredPermissions: ["canViewProduction"] },
          { label: "Công nghệ in / thêu", href: "/admin/print-methods", status: "active", requiredPermissions: ["canViewProduction"] },
        ],
      },
      {
        label: "Tech Pack Platform",
        requiredPermissions: ["canViewProduction"],
        items: [
          { label: "Tech Pack", href: "/admin/tech-pack", status: "active" },
          { label: "Thư viện rập", href: "/admin/pattern", status: "active" },
          { label: "Mẫu thông số", href: "/admin/measurement-template", status: "active" },
        ],
      },
    ],
  },
  {
    label: "WEBSITE",
    icon: "🌐",
    platforms: [
      {
        label: "Content Platform",
        requiredPermissions: ["canManageCms"],
        items: [
          { label: "Homepage", href: "/admin/settings/homepage", status: "active" },
          { label: "Landing Page", href: "/admin/landing-pages", status: "active" },
          { label: "Blog", href: "/admin/blog", status: "active" },
          { label: "FAQ", status: "coming-soon" },
          { label: "Case Study", href: "/admin/case-studies", status: "active" },
          { label: "Client Logo", href: "/admin/client-logos", status: "active" },
          { label: "Banner", href: "/admin/settings/homepage", status: "active" },
          { label: "Media Library", href: "/admin/media", status: "active" },
          { label: "SEO", href: "/admin/seo-planning", status: "active" },
        ],
      },
    ],
  },
  {
    label: "ĐIỀU HÀNH",
    icon: "📊",
    platforms: [
      {
        label: "Business Intelligence",
        items: [
          { label: "Dashboard", href: "/admin/operations", status: "active", requiredPermissions: ["canViewOrders"] },
          { label: "Revenue", href: "/admin/crm/revenue-categories", status: "active", requiredPermissions: ["canViewFinancials"] },
          { label: "Sales", href: "/admin/crm/sales", status: "active", requiredPermissions: ["canViewReports"] },
          { label: "CRM", href: "/admin/crm/reports", status: "active", requiredPermissions: ["canViewReports"] },
          { label: "Dealer", href: "/admin/dealer", status: "active", requiredPermissions: ["canViewCrm"] },
          { label: "Product", href: "/admin/products", status: "active", requiredPermissions: ["canManageProducts"] },
          { label: "Manufacturing", href: "/admin/production", status: "active", requiredPermissions: ["canViewProduction"] },
          { label: "Inventory", href: "/admin/materials/warehouse", status: "active", requiredPermissions: ["canViewWarehouse"] },
        ],
      },
      {
        label: "Operations Platform",
        items: [
          { label: "Nhân viên", href: "/admin/employees", status: "active", requiredPermissions: ["canManageEmployees"] },
          { label: "Users", href: "/admin/settings/users", status: "active", requiredPermissions: ["canManageUsers"] },
          { label: "Roles", href: "/admin/settings/roles", status: "active", requiredPermissions: ["canManageRoles"] },
          { label: "Permissions", href: "/admin/settings/roles", status: "active", requiredPermissions: ["canManageRoles"] },
          { label: "Công ty", href: "/admin/settings/company", status: "active", requiredPermissions: ["canViewDashboard"] },
          { label: "Branding", href: "/admin/settings/branding", status: "active", requiredPermissions: ["canViewDashboard"] },
          { label: "Thông báo", status: "coming-soon", requiredPermissions: ["canViewDashboard"] },
          { label: "Audit Logs", status: "coming-soon", requiredPermissions: ["canManageUsers"] },
          { label: "Jobs", status: "coming-soon", requiredPermissions: ["canViewDashboard"] },
          { label: "Cấu hình", href: "/admin/settings/trust", status: "active", requiredPermissions: ["canViewDashboard"] },
        ],
      },
    ],
  },
  {
    label: "AI",
    icon: "🤖",
    platforms: [
      {
        label: "AI Platform",
        requiredPermissions: ["canManageCms"],
        items: [
          { label: "Knowledge Base", href: "/admin/knowledge-base", status: "active" },
          { label: "AI Assistant", href: "/admin/crm/whatsapp-assistant", status: "active", requiredPermissions: ["canViewCrm"] },
          { label: "AI Image Studio", status: "coming-soon" },
          { label: "OCR", status: "coming-soon" },
          { label: "Prompt Library", href: "/admin/knowledge-base/context-preview", status: "active" },
          { label: "Automation", status: "coming-soon" },
        ],
      },
      {
        label: "Growth Platform",
        requiredPermissions: ["canManageCms"],
        items: [
          { label: "Campaign", href: "/admin/seo-planning", status: "active" },
          { label: "Promotion", status: "coming-soon" },
          { label: "Coupon", status: "coming-soon" },
          { label: "Email", status: "coming-soon" },
          { label: "Zalo OA", status: "coming-soon" },
          { label: "Facebook Lead", status: "coming-soon" },
          { label: "Google Ads", status: "coming-soon" },
          { label: "TikTok", status: "coming-soon" },
          { label: "Referral", status: "coming-soon" },
          { label: "Affiliate", status: "coming-soon" },
          { label: "Conversion Tracking", status: "coming-soon" },
        ],
      },
    ],
  },
];
