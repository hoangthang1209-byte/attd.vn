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
  /** Internal grouping only — empty label means no visible third-level heading. */
  label: string;
  items: AdminNavigationItem[];
  requiredPermissions?: AdminPermissionKey[];
};

export type AdminNavigationSection = {
  label: string;
  icon: string;
  platforms: AdminNavigationPlatform[];
};

/** One internal platform bucket per domain (no visible subgroup label). */
function domainItems(items: AdminNavigationItem[]): AdminNavigationPlatform[] {
  return [{ label: "", items }];
}

export const adminDashboardNavItem: AdminNavigationItem = {
  label: "Dashboard",
  href: "/admin/dashboard",
  status: "active",
  requiredPermissions: ["canViewDashboard"],
};

/**
 * CMS IA v2.0 — production sidebar registry (domain → items only).
 * Coming-soon / roadmap items are intentionally omitted.
 */
export const adminNavigationSections: AdminNavigationSection[] = [
  {
    label: "THƯƠNG MẠI",
    icon: "💼",
    platforms: domainItems([
      { label: "CRM", href: "/admin/crm", status: "active", requiredPermissions: ["canViewCrm"] },
      { label: "Lead", href: "/admin/crm/leads", status: "active", requiredPermissions: ["canViewCrm"] },
      { label: "Khách hàng", href: "/admin/crm/customers", status: "active", requiredPermissions: ["canViewCrm"] },
      { label: "Follow-up", href: "/admin/sales/follow-up", status: "active", requiredPermissions: ["canAccessQuotes"] },
      { label: "Pipeline bán hàng", href: "/admin/sales/pipeline", status: "active", requiredPermissions: ["canAccessQuotes"] },
      { label: "AI Assistant", href: "/admin/crm/whatsapp-assistant", status: "active", requiredPermissions: ["canViewCrm"] },
      { label: "Báo giá", href: "/admin/quotes", status: "active", requiredPermissions: ["canAccessQuotes"] },
      { label: "Đơn hàng", href: "/admin/orders", status: "active", requiredPermissions: ["canViewOrders"] },
      { label: "Bảng giá", href: "/admin/pricing", status: "active", requiredPermissions: ["canAccessPricing"] },
    ]),
  },
  {
    label: "SẢN PHẨM",
    icon: "📦",
    platforms: domainItems([
      { label: "Sản phẩm", href: "/admin/products", status: "active", requiredPermissions: ["canManageProducts"] },
      { label: "Danh mục", href: "/admin/danh-muc", status: "active", requiredPermissions: ["canManageProducts"] },
      { label: "SKU & Biến thể", href: "/admin/variant", status: "active", requiredPermissions: ["canManageProducts"] },
      { label: "Thuộc tính", href: "/admin/attributes", status: "active", requiredPermissions: ["canManageProducts"] },
      { label: "Giá sản phẩm", href: "/admin/pricing/product-tiers", status: "active", requiredPermissions: ["canAccessPricing"] },
    ]),
  },
  {
    label: "KỸ THUẬT SẢN PHẨM",
    icon: "📐",
    platforms: domainItems([
      { label: "Tech Pack", href: "/admin/tech-pack", status: "active", requiredPermissions: ["canViewProduction"] },
      { label: "Thư viện rập", href: "/admin/pattern", status: "active", requiredPermissions: ["canViewProduction"] },
      { label: "Mẫu thông số", href: "/admin/measurement-template", status: "active", requiredPermissions: ["canViewProduction"] },
      { label: "Nguyên vật liệu", href: "/admin/production-materials", status: "active", requiredPermissions: ["canViewProduction"] },
      { label: "Phụ liệu", href: "/admin/trims", status: "active", requiredPermissions: ["canViewProduction"] },
    ]),
  },
  {
    label: "SẢN XUẤT",
    icon: "🏭",
    platforms: domainItems([
      { label: "Lệnh sản xuất", href: "/admin/production", status: "active", requiredPermissions: ["canViewProduction"] },
      {
        label: "Thư viện sản xuất",
        href: "/admin/manufacturing-library",
        status: "active",
        requiredPermissions: ["canManageManufacturingLibrary"],
      },
      { label: "Công nghệ in & thêu", href: "/admin/print-methods", status: "active", requiredPermissions: ["canViewProduction"] },
      { label: "Nhà cung cấp sản xuất", href: "/admin/production-suppliers", status: "active", requiredPermissions: ["canViewProduction"] },
    ]),
  },
  {
    label: "ĐẠI LÝ & B2B",
    icon: "🏢",
    platforms: domainItems([
      { label: "Công ty đại lý", href: "/admin/dealer", status: "active", requiredPermissions: ["canViewCrm"] },
      { label: "Yêu cầu báo giá", href: "/admin/dealer/rfqs", status: "active", requiredPermissions: ["canViewCrm"] },
      { label: "Nhóm giá đại lý", href: "/admin/pricing/price-groups", status: "active", requiredPermissions: ["canAccessPricing"] },
    ]),
  },
  {
    label: "NỘI DUNG",
    icon: "📝",
    platforms: domainItems([
      { label: "Blog", href: "/admin/blog", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Landing Page", href: "/admin/landing-pages", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Case Study", href: "/admin/case-studies", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Kiểm duyệt nội dung", href: "/admin/content/reviews", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Xuất bản nội dung", href: "/admin/content/publishing", status: "active", requiredPermissions: ["canManageCms"] },
    ]),
  },
  {
    label: "SEO & GROWTH",
    icon: "📈",
    platforms: domainItems([
      { label: "Tổng quan SEO", href: "/admin/content/seo", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Chiến lược SEO", href: "/admin/content/seo-strategies", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Kế hoạch nội dung", href: "/admin/content/seo-topics", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Khởi động Content SEO", href: "/admin/content/launch", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "SEO Planning", href: "/admin/seo-planning", status: "active", requiredPermissions: ["canManageCms"] },
    ]),
  },
  {
    label: "MEDIA",
    icon: "🖼️",
    platforms: domainItems([
      { label: "Thư viện tài sản", href: "/admin/media", status: "active", requiredPermissions: ["canManageProducts"] },
      { label: "Nhóm thư viện", href: "/admin/content/media-libraries", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Vai trò hiển thị", href: "/admin/content/media-roles", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Bộ sưu tập", href: "/admin/content/media-collections", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Từ điển metadata", href: "/admin/content/media-vocabulary", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Gói hình ảnh", href: "/admin/content/media-bundles", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Độ phủ hình ảnh", href: "/admin/content/media-coverage", status: "active", requiredPermissions: ["canManageCms"] },
    ]),
  },
  {
    label: "WEBSITE",
    icon: "🌐",
    platforms: domainItems([
      { label: "Homepage", href: "/admin/settings/homepage", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Điều hướng & Footer", href: "/admin/site-navigation", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Logo khách hàng", href: "/admin/client-logos", status: "active", requiredPermissions: ["canManageCms"] },
    ]),
  },
  {
    label: "KNOWLEDGE & AI",
    icon: "🧠",
    platforms: domainItems([
      { label: "Knowledge Base", href: "/admin/knowledge-base", status: "active", requiredPermissions: ["canManageCms"] },
      { label: "Knowledge Graph", href: "/admin/knowledge-graph", status: "active", requiredPermissions: ["canManageCms"] },
      {
        label: "Quan hệ Knowledge Graph",
        href: "/admin/knowledge-graph/relationships",
        status: "active",
        requiredPermissions: ["canManageCms"],
      },
      {
        label: "Đánh giá Knowledge Graph",
        href: "/admin/knowledge-graph/evaluation",
        status: "active",
        requiredPermissions: ["canManageCms"],
      },
      {
        label: "Prompt & Context",
        href: "/admin/knowledge-base/context-preview",
        status: "active",
        requiredPermissions: ["canManageCms"],
      },
      {
        label: "Kiểm tra ngữ cảnh AI",
        href: "/admin/content/ai-retrieval",
        status: "active",
        requiredPermissions: ["canManageCms"],
      },
    ]),
  },
  {
    label: "VẬN HÀNH",
    icon: "🚚",
    platforms: domainItems([
      { label: "Tổng quan vận hành", href: "/admin/operations", status: "active", requiredPermissions: ["canViewOrders"] },
      { label: "Giao hàng", href: "/admin/delivery", status: "active", requiredPermissions: ["canViewDelivery"] },
      { label: "Tồn kho", href: "/admin/materials/warehouse", status: "active", requiredPermissions: ["canViewWarehouse"] },
      { label: "Nhân viên", href: "/admin/employees", status: "active", requiredPermissions: ["canManageEmployees"] },
    ]),
  },
  {
    label: "BÁO CÁO",
    icon: "📊",
    platforms: domainItems([
      {
        label: "Báo cáo doanh thu",
        href: "/admin/crm/revenue-categories",
        status: "active",
        requiredPermissions: ["canViewFinancials"],
      },
      { label: "Báo cáo bán hàng", href: "/admin/crm/sales", status: "active", requiredPermissions: ["canViewReports"] },
      { label: "Báo cáo CRM", href: "/admin/crm/reports", status: "active", requiredPermissions: ["canViewReports"] },
    ]),
  },
  {
    label: "HỆ THỐNG",
    icon: "⚙️",
    platforms: domainItems([
      { label: "Người dùng", href: "/admin/settings/users", status: "active", requiredPermissions: ["canManageUsers"] },
      { label: "Vai trò & quyền", href: "/admin/settings/roles", status: "active", requiredPermissions: ["canManageRoles"] },
      { label: "Thông tin công ty", href: "/admin/settings/company", status: "active", requiredPermissions: ["canViewDashboard"] },
      { label: "Nhận diện thương hiệu", href: "/admin/settings/branding", status: "active", requiredPermissions: ["canViewDashboard"] },
      { label: "Cấu hình hệ thống", href: "/admin/settings/trust", status: "active", requiredPermissions: ["canViewDashboard"] },
    ]),
  },
];
