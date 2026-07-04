"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import AdminScrollRestoration from "@/components/admin/AdminScrollRestoration";
import { AdminTitleProvider, useAdminTitle } from "@/components/admin/AdminTitleContext";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";

type NavItem = { href: string; label: string; visible?: (p: import("@/components/admin/AdminPermissionsContext").AdminPermissionFlags) => boolean };

type NavGroup = {
  label: string | null;
  items: NavItem[];
  visible?: (p: import("@/components/admin/AdminPermissionsContext").AdminPermissionFlags) => boolean;
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/admin/dashboard", label: "Tổng quan", visible: (p) => p.canViewDashboard }],
  },
  {
    label: "Sản phẩm",
    visible: (p) => p.canManageProducts || p.canViewDashboard,
    items: [
      { href: "/admin/products", label: "Danh sách sản phẩm", visible: (p) => p.canManageProducts },
      { href: "/admin/products/new", label: "Thêm sản phẩm", visible: (p) => p.canManageProducts },
      { href: "/admin/danh-muc", label: "Danh mục sản phẩm", visible: (p) => p.canManageProducts },
      { href: "/admin/attributes", label: "Thuộc tính sản phẩm", visible: (p) => p.canManageProducts },
      { href: "/admin/products/import", label: "Nhập sản phẩm", visible: (p) => p.canManageProducts },
      { href: "/admin/media", label: "Thư viện Media", visible: (p) => p.canManageProducts },
    ],
  },
  {
    label: "Knowledge Base",
    visible: (p) => p.canManageCms,
    items: [
      { href: "/admin/knowledge-base", label: "Danh sách KB", visible: (p) => p.canManageCms },
      { href: "/admin/knowledge-base?import=1", label: "Nhập dữ liệu KB", visible: (p) => p.canManageCms },
      { href: "/admin/knowledge-base/context-preview", label: "Xem trước ngữ cảnh AI", visible: (p) => p.canManageCms },
    ],
  },
  {
    label: "SEO & Content",
    visible: (p) => p.canManageCms,
    items: [
      { href: "/admin/blog", label: "Blog", visible: (p) => p.canManageCms },
      { href: "/admin/landing-pages", label: "Landing pages", visible: (p) => p.canManageCms },
      { href: "/admin/seo-planning", label: "SEO Planning", visible: (p) => p.canManageCms },
      { href: "/admin/seo/brief-generator", label: "SEO Brief Generator", visible: (p) => p.canManageCms },
      { href: "/admin/ai-content-factory", label: "AI Content Factory", visible: (p) => p.canManageCms },
    ],
  },
  {
    label: "CRM",
    visible: (p) => p.canViewCrm,
    items: [
      { href: "/admin/crm", label: "CRM", visible: (p) => p.canViewCrm },
      { href: "/admin/crm/leads", label: "Leads", visible: (p) => p.canViewCrm },
      { href: "/admin/crm/customers", label: "Khách hàng", visible: (p) => p.canViewCrm },
      { href: "/admin/crm/whatsapp-assistant", label: "WhatsApp AI", visible: (p) => p.canViewCrm },
      { href: "/admin/crm/reports", label: "Báo cáo CRM", visible: (p) => p.canViewReports },
      { href: "/admin/crm/revenue-categories", label: "Nhóm doanh thu", visible: (p) => p.canViewFinancials },
    ],
  },
  {
    label: "Dealer Portal",
    visible: (p) => p.canViewCrm,
    items: [
      { href: "/admin/dealer", label: "Đại lý", visible: (p) => p.canViewCrm },
      { href: "/admin/dealer/rfqs", label: "RFQ", visible: (p) => p.canViewCrm },
    ],
  },
  {
    label: "Báo giá",
    visible: (p) => p.canAccessQuotes,
    items: [
      { href: "/admin/quotes", label: "Danh sách báo giá", visible: (p) => p.canAccessQuotes },
      { href: "/admin/quotes/new", label: "Tạo báo giá", visible: (p) => p.canAccessQuotes },
    ],
  },
  {
    label: "Nguyên phụ liệu",
    visible: (p) => p.canViewWarehouse,
    items: [
      { href: "/admin/materials", label: "Vật tư", visible: (p) => p.canViewWarehouse },
      { href: "/admin/material-suppliers", label: "Nhà cung cấp NPL", visible: (p) => p.canViewWarehouse },
      { href: "/admin/materials/warehouse", label: "Tồn kho vật tư", visible: (p) => p.canViewWarehouse },
      { href: "/admin/purchase-requests", label: "Yêu cầu mua hàng", visible: (p) => p.canViewWarehouse },
    ],
  },
  {
    label: "Đơn hàng",
    visible: (p) => p.canViewOrders || p.canViewDelivery,
    items: [
      { href: "/admin/operations", label: "Tổng quan vận hành", visible: (p) => p.canViewOrders },
      { href: "/admin/orders", label: "Đơn hàng", visible: (p) => p.canViewOrders },
      { href: "/admin/delivery", label: "Vận hành giao hàng", visible: (p) => p.canViewDelivery },
      { href: "/admin/employees", label: "Nhân viên", visible: (p) => p.canManageEmployees },
      { href: "/admin/delivery-methods", label: "Hình thức giao hàng", visible: (p) => p.canViewDelivery },
      { href: "/admin/delivery-carriers", label: "Đơn vị vận chuyển", visible: (p) => p.canViewDelivery },
    ],
  },
  {
    label: "Sản xuất",
    visible: (p) => p.canViewProduction,
    items: [
      { href: "/admin/production", label: "Tổng quan sản xuất", visible: (p) => p.canViewProduction },
      { href: "/admin/production/plan", label: "Kế hoạch sản xuất", visible: (p) => p.canViewProduction },
      { href: "/admin/production/jobs", label: "Công việc sản xuất", visible: (p) => p.canViewProduction },
      { href: "/admin/production/board", label: "Bảng tiến độ", visible: (p) => p.canViewProduction },
      { href: "/admin/production/plan?quickFilter=awaiting_qc", label: "QC", visible: (p) => p.canViewProduction },
      { href: "/admin/production/plan?quickFilter=missing_docs", label: "Tài liệu sản xuất", visible: (p) => p.canViewProduction },
    ],
  },
  {
    label: "Thư viện sản xuất",
    visible: (p) => p.canManageManufacturingLibrary,
    items: [
      { href: "/admin/manufacturing-library", label: "Tài sản sản xuất", visible: (p) => p.canManageManufacturingLibrary },
      { href: "/admin/manufacturing-library/categories", label: "Danh mục", visible: (p) => p.canManageManufacturingLibrary },
      { href: "/admin/manufacturing-library/display-locations", label: "Vị trí hiển thị", visible: (p) => p.canManageManufacturingLibrary },
      { href: "/admin/manufacturing-library/workflows", label: "Quy trình", visible: (p) => p.canManageManufacturingLibrary },
    ],
  },
  {
    label: "TECH PACK",
    visible: (p) => p.canViewProduction,
    items: [
      { href: "/admin/tech-pack", label: "Tech Pack", visible: (p) => p.canViewProduction },
      { href: "/admin/pattern", label: "Thư viện rập", visible: (p) => p.canViewProduction },
      { href: "/admin/measurement-template", label: "Mẫu thông số", visible: (p) => p.canViewProduction },
      { href: "/admin/production-materials", label: "Vật liệu sản xuất", visible: (p) => p.canViewProduction },
      { href: "/admin/trims", label: "Phụ liệu sản xuất", visible: (p) => p.canViewProduction },
      { href: "/admin/production-suppliers", label: "Nhà cung cấp SX", visible: (p) => p.canViewProduction },
      { href: "/admin/print-methods", label: "Công nghệ in / thêu", visible: (p) => p.canViewProduction },
    ],
  },
  {
    label: "Tính giá",
    visible: (p) => p.canAccessPricing,
    items: [
      { href: "/admin/pricing", label: "Tổng quan", visible: (p) => p.canAccessPricing },
      { href: "/admin/pricing/calculator", label: "Bộ tính giá", visible: (p) => p.canAccessPricing },
      { href: "/admin/pricing/price-groups", label: "Nhóm giá", visible: (p) => p.canAccessPricing },
      { href: "/admin/pricing/product-tiers", label: "Bảng giá sản phẩm", visible: (p) => p.canAccessPricing },
      { href: "/admin/pricing/service-rules", label: "Phí dịch vụ", visible: (p) => p.canAccessPricing },
      { href: "/admin/pricing/history", label: "Lịch sử tính giá", visible: (p) => p.canAccessPricing },
    ],
  },
  {
    label: "Marketing",
    visible: (p) => p.canManageCms,
    items: [
      { href: "/admin/client-logos", label: "Logo khách hàng", visible: (p) => p.canManageCms },
      { href: "/admin/case-studies", label: "Dự án tiêu biểu", visible: (p) => p.canManageCms },
    ],
  },
  {
    label: "Quản trị hệ thống",
    visible: (p) => p.canManageUsers || p.canManageRoles,
    items: [
      { href: "/admin/settings/users", label: "Tài khoản đăng nhập", visible: (p) => p.canManageUsers },
      { href: "/admin/settings/roles", label: "Vai trò & phân quyền", visible: (p) => p.canManageRoles },
    ],
  },
  {
    label: "Cài đặt",
    visible: (p) => p.canViewDashboard,
    items: [
      { href: "/admin/settings/company", label: "Thông tin công ty", visible: (p) => p.canViewDashboard },
      { href: "/admin/settings/trust", label: "Chỉ số tin cậy", visible: (p) => p.canViewDashboard },
      { href: "/admin/settings/branding", label: "Nhận diện thương hiệu", visible: (p) => p.canViewDashboard },
      { href: "/admin/settings/homepage", label: "Nội dung trang chủ", visible: (p) => p.canViewDashboard },
      { href: "/admin/demo", label: "🎭 Dữ liệu demo", visible: (p) => p.canViewDashboard },
    ],
  },
];

function isNavItemActive(
  href: string,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  const [path, queryString] = href.split("?");
  const pathMatches =
    pathname === path ||
    (path !== "/admin" && pathname.startsWith(`${path}/`));

  if (!pathMatches) return false;

  if (!queryString) {
    if (pathname === path) return true;
    return pathname.startsWith(`${path}/`);
  }

  if (pathname !== path) return false;
  const expected = new URLSearchParams(queryString);
  for (const [key, value] of expected.entries()) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}

function AdminShellNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { permissions } = useAdminPermissions();

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.visible || item.visible(permissions)),
    }))
      .filter((group) => (!group.visible || group.visible(permissions)) && group.items.length > 0);
  }, [permissions]);

  return (
    <nav className="admin-nav">
      {visibleGroups.map((group) => (
        <div key={group.label ?? "root"} className="admin-nav-group">
          {group.label && <p className="admin-nav-group-label">{group.label}</p>}
          {group.items.map((item) => {
            const active = isNavItemActive(item.href, pathname, searchParams);
            return (
              <Link
                key={item.href}
                href={item.href}
                scroll={false}
                prefetch
                className={`admin-nav-link${active ? " admin-nav-link--active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function AdminShellMain({ children }: { children: React.ReactNode }) {
  const { title } = useAdminTitle();

  return (
    <main id="admin-content-scroll" className="admin-main admin-content-scroll">
      <Suspense fallback={null}>
        <AdminScrollRestoration />
      </Suspense>
      {title ? <h1 className="admin-title">{title}</h1> : null}
      <div className="admin-main-content">{children}</div>
    </main>
  );
}

/** Persistent admin app shell — mounted once in admin layout. */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return children;
  }

  return (
    <AdminTitleProvider>
      <div className="admin-app-shell admin-shell">
        <aside
          className={`admin-sidebar${mobileNavOpen ? " is-mobile-open" : ""}`}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) {
              setMobileNavOpen(false);
            }
          }}
        >
          <div className="admin-sidebar-top">
            <Link href="/admin/dashboard" scroll={false} className="admin-brand">
              ATTD CMS
            </Link>
            <div className="admin-sidebar-actions">
              <AdminLogoutButton />
              <button
                type="button"
                className="admin-mobile-nav-toggle"
                onClick={() => setMobileNavOpen((current) => !current)}
                aria-expanded={mobileNavOpen}
                aria-controls="admin-primary-navigation"
                aria-label={mobileNavOpen ? "Đóng menu quản trị" : "Mở menu quản trị"}
              >
                {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
          <div id="admin-primary-navigation" className="admin-sidebar-nav-wrap">
            <Suspense fallback={null}>
              <AdminShellNav />
            </Suspense>
          </div>
        </aside>
        <AdminShellMain>{children}</AdminShellMain>
      </div>
    </AdminTitleProvider>
  );
}
