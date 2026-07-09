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
    label: "THƯƠNG MẠI",
    icon: "💼",
    platforms: [
      {
        label: "CRM & Sales",
        items: [
          { label: "CRM Pipeline", href: "/admin/crm", status: "active", requiredPermissions: ["canViewCrm"] },
          { label: "Lead", href: "/admin/crm/leads", status: "active", requiredPermissions: ["canViewCrm"] },
          { label: "Khách hàng", href: "/admin/crm/customers", status: "active", requiredPermissions: ["canViewCrm"] },
          { label: "Người liên hệ", status: "coming-soon", requiredPermissions: ["canViewCrm"] },
          { label: "Follow-up", href: "/admin/sales/follow-up", status: "active", requiredPermissions: ["canAccessQuotes"] },
          { label: "Pipeline bán hàng", href: "/admin/sales/pipeline", status: "active", requiredPermissions: ["canAccessQuotes"] },
          { label: "AI Assistant", href: "/admin/crm/whatsapp-assistant", status: "active", requiredPermissions: ["canViewCrm"] },
        ],
      },
      {
        label: "Báo giá & Đơn hàng",
        items: [
          { label: "Báo giá", href: "/admin/quotes", status: "active", requiredPermissions: ["canAccessQuotes"] },
          { label: "Bảng giá", href: "/admin/pricing", status: "active", requiredPermissions: ["canAccessPricing"] },
          { label: "Đơn hàng", href: "/admin/orders", status: "active", requiredPermissions: ["canViewOrders"] },
          { label: "Thanh toán", status: "coming-soon", requiredPermissions: ["canViewFinancials"] },
          { label: "Hóa đơn", status: "coming-soon", requiredPermissions: ["canViewFinancials"] },
          { label: "Margin", status: "coming-soon", requiredPermissions: ["canViewFinancials"] },
          { label: "Commission", status: "coming-soon", requiredPermissions: ["canViewFinancials"] },
        ],
      },
    ],
  },
  {
    label: "SẢN PHẨM",
    icon: "📦",
    platforms: [
      {
        label: "Catalog",
        items: [
          { label: "Sản phẩm", href: "/admin/products", status: "active", requiredPermissions: ["canManageProducts"] },
          { label: "Danh mục", href: "/admin/danh-muc", status: "active", requiredPermissions: ["canManageProducts"] },
          { label: "SKU / Biến thể", href: "/admin/variant", status: "active", requiredPermissions: ["canManageProducts"] },
          { label: "Thuộc tính", href: "/admin/attributes", status: "active", requiredPermissions: ["canManageProducts"] },
          { label: "Thư viện ảnh", href: "/admin/media", status: "active", requiredPermissions: ["canManageProducts"] },
          { label: "Import / Export", href: "/admin/products/import", status: "active", requiredPermissions: ["canManageProducts"] },
        ],
      },
      {
        label: "Giá & Tồn kho",
        items: [
          { label: "Bảng giá sản phẩm", href: "/admin/pricing/product-tiers", status: "active", requiredPermissions: ["canAccessPricing"] },
          { label: "Tồn kho", href: "/admin/materials/warehouse", status: "active", requiredPermissions: ["canViewWarehouse"] },
        ],
      },
    ],
  },
  {
    label: "KỸ THUẬT SẢN PHẨM",
    icon: "📐",
    platforms: [
      {
        label: "Tech Pack & Pattern",
        items: [
          { label: "Tech Pack", href: "/admin/tech-pack", status: "active", requiredPermissions: ["canViewProduction"] },
          { label: "Thư viện rập", href: "/admin/pattern", status: "active", requiredPermissions: ["canViewProduction"] },
          { label: "Mẫu thông số", href: "/admin/measurement-template", status: "active", requiredPermissions: ["canViewProduction"] },
        ],
      },
      {
        label: "Materials / BOM",
        items: [
          { label: "Vật liệu", href: "/admin/production-materials", status: "active", requiredPermissions: ["canViewProduction"] },
          { label: "Phụ liệu", href: "/admin/trims", status: "active", requiredPermissions: ["canViewProduction"] },
        ],
      },
    ],
  },
  {
    label: "SẢN XUẤT",
    icon: "🏭",
    platforms: [
      {
        label: "Production",
        items: [
          { label: "Lệnh sản xuất", href: "/admin/production", status: "active", requiredPermissions: ["canViewProduction"] },
          { label: "Công nghệ in / thêu", href: "/admin/print-methods", status: "active", requiredPermissions: ["canViewProduction"] },
          { label: "Nhà cung cấp sản xuất", href: "/admin/production-suppliers", status: "active", requiredPermissions: ["canViewProduction"] },
          { label: "Sample Tracking", status: "coming-soon", requiredPermissions: ["canViewProduction"] },
          { label: "QA / QC", status: "coming-soon", requiredPermissions: ["canViewProduction"] },
        ],
      },
    ],
  },
  {
    label: "ĐẠI LÝ / B2B",
    icon: "🏢",
    platforms: [
      {
        label: "Dealer",
        items: [
          { label: "Công ty đại lý", href: "/admin/dealer", status: "active", requiredPermissions: ["canViewCrm"] },
          { label: "RFQ", href: "/admin/dealer/rfqs", status: "active", requiredPermissions: ["canViewCrm"] },
          { label: "Bảng giá đại lý", href: "/admin/pricing/price-groups", status: "active", requiredPermissions: ["canAccessPricing"] },
          { label: "Chính sách đại lý", status: "coming-soon", requiredPermissions: ["canViewCrm"] },
          { label: "Hỗ trợ đại lý", status: "coming-soon", requiredPermissions: ["canViewCrm"] },
        ],
      },
    ],
  },
  {
    label: "NỘI DUNG & WEBSITE",
    icon: "🌐",
    platforms: [
      {
        label: "Website",
        items: [
          { label: "Homepage", href: "/admin/settings/homepage", status: "active", requiredPermissions: ["canManageCms"] },
          { label: "Landing Page", href: "/admin/landing-pages", status: "active", requiredPermissions: ["canManageCms"] },
          { label: "Blog", href: "/admin/blog", status: "active", requiredPermissions: ["canManageCms"] },
          { label: "Case Study", href: "/admin/case-studies", status: "active", requiredPermissions: ["canManageCms"] },
          { label: "Client Logo", href: "/admin/client-logos", status: "active", requiredPermissions: ["canManageCms"] },
          { label: "SEO", href: "/admin/seo-planning", status: "active", requiredPermissions: ["canManageCms"] },
          { label: "FAQ", status: "coming-soon", requiredPermissions: ["canManageCms"] },
        ],
      },
      {
        label: "Knowledge",
        items: [
          { label: "Knowledge Base", href: "/admin/knowledge-base", status: "active", requiredPermissions: ["canManageCms"] },
          { label: "Prompt Library", href: "/admin/knowledge-base/context-preview", status: "active", requiredPermissions: ["canManageCms"] },
        ],
      },
    ],
  },
  {
    label: "VẬN HÀNH",
    icon: "🚚",
    platforms: [
      {
        label: "Operations",
        items: [
          { label: "Dashboard vận hành", href: "/admin/operations", status: "active", requiredPermissions: ["canViewOrders"] },
          { label: "Giao hàng", href: "/admin/delivery", status: "active", requiredPermissions: ["canViewDelivery"] },
          { label: "Nhân viên", href: "/admin/employees", status: "active", requiredPermissions: ["canManageEmployees"] },
          { label: "Thông báo", status: "coming-soon", requiredPermissions: ["canViewDashboard"] },
          { label: "Jobs", status: "coming-soon", requiredPermissions: ["canViewDashboard"] },
        ],
      },
    ],
  },
  {
    label: "BUSINESS INTELLIGENCE",
    icon: "📊",
    platforms: [
      {
        label: "Reports",
        items: [
          { label: "Revenue", href: "/admin/crm/revenue-categories", status: "active", requiredPermissions: ["canViewFinancials"] },
          { label: "Sales", href: "/admin/crm/sales", status: "active", requiredPermissions: ["canViewReports"] },
          { label: "CRM", href: "/admin/crm/reports", status: "active", requiredPermissions: ["canViewReports"] },
          { label: "Dealer", status: "coming-soon", requiredPermissions: ["canViewCrm"] },
          { label: "Product", status: "coming-soon", requiredPermissions: ["canManageProducts"] },
          { label: "Manufacturing", status: "coming-soon", requiredPermissions: ["canViewProduction"] },
          { label: "Inventory", status: "coming-soon", requiredPermissions: ["canViewWarehouse"] },
        ],
      },
    ],
  },
  {
    label: "AI & GROWTH",
    icon: "🤖",
    platforms: [
      {
        label: "AI",
        items: [
          { label: "AI Image Studio", status: "coming-soon", requiredPermissions: ["canManageCms"] },
          { label: "OCR", status: "coming-soon", requiredPermissions: ["canManageCms"] },
          { label: "Automation", status: "coming-soon", requiredPermissions: ["canManageCms"] },
        ],
      },
      {
        label: "Growth",
        items: [
          { label: "Campaign", status: "coming-soon", requiredPermissions: ["canManageCms"] },
          { label: "Promotion", status: "coming-soon", requiredPermissions: ["canManageCms"] },
          { label: "Coupon", status: "coming-soon", requiredPermissions: ["canManageCms"] },
          { label: "Email", status: "coming-soon", requiredPermissions: ["canManageCms"] },
          { label: "Zalo OA", status: "coming-soon", requiredPermissions: ["canManageCms"] },
          { label: "Facebook Lead", status: "coming-soon", requiredPermissions: ["canManageCms"] },
          { label: "Google Ads", status: "coming-soon", requiredPermissions: ["canManageCms"] },
          { label: "TikTok", status: "coming-soon", requiredPermissions: ["canManageCms"] },
          { label: "Referral", status: "coming-soon", requiredPermissions: ["canManageCms"] },
          { label: "Affiliate", status: "coming-soon", requiredPermissions: ["canManageCms"] },
          { label: "Conversion Tracking", status: "coming-soon", requiredPermissions: ["canManageCms"] },
        ],
      },
    ],
  },
  {
    label: "HỆ THỐNG",
    icon: "⚙️",
    platforms: [
      {
        label: "Admin",
        items: [
          { label: "Users", href: "/admin/settings/users", status: "active", requiredPermissions: ["canManageUsers"] },
          { label: "Roles", href: "/admin/settings/roles", status: "active", requiredPermissions: ["canManageRoles"] },
          { label: "Permissions", status: "coming-soon", requiredPermissions: ["canManageRoles"] },
          { label: "Công ty", href: "/admin/settings/company", status: "active", requiredPermissions: ["canViewDashboard"] },
          { label: "Branding", href: "/admin/settings/branding", status: "active", requiredPermissions: ["canViewDashboard"] },
          { label: "Cấu hình", href: "/admin/settings/trust", status: "active", requiredPermissions: ["canViewDashboard"] },
          { label: "Audit Logs", status: "coming-soon", requiredPermissions: ["canManageUsers"] },
        ],
      },
    ],
  },
];
