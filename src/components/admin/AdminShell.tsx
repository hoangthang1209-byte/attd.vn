"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import AdminScrollRestoration from "@/components/admin/AdminScrollRestoration";
import { AdminTitleProvider, useAdminTitle } from "@/components/admin/AdminTitleContext";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";

type NavItem = { href: string; label: string; financial?: boolean };

type NavGroup = {
  label: string | null;
  items: NavItem[];
  financial?: boolean;
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/admin/dashboard", label: "Tổng quan" }],
  },
  {
    label: "Sản phẩm",
    items: [
      { href: "/admin/products", label: "Danh sách sản phẩm" },
      { href: "/admin/products/new", label: "Thêm sản phẩm" },
      { href: "/admin/danh-muc", label: "Danh mục sản phẩm" },
      { href: "/admin/attributes", label: "Thuộc tính sản phẩm" },
      { href: "/admin/products/import", label: "Nhập sản phẩm" },
      { href: "/admin/media", label: "Thư viện Media" },
    ],
  },
  {
    label: "Knowledge Base",
    items: [
      { href: "/admin/knowledge-base", label: "Danh sách KB" },
      { href: "/admin/knowledge-base?import=1", label: "Nhập dữ liệu KB" },
      { href: "/admin/knowledge-base/context-preview", label: "Xem trước ngữ cảnh AI" },
    ],
  },
  {
    label: "SEO & Content",
    items: [
      { href: "/admin/blog", label: "Blog" },
      { href: "/admin/landing-pages", label: "Landing pages" },
      { href: "/admin/seo-planning", label: "SEO Planning" },
      { href: "/admin/seo/brief-generator", label: "SEO Brief Generator" },
      { href: "/admin/ai-content-factory", label: "AI Content Factory" },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/admin/crm", label: "CRM" },
      { href: "/admin/crm/leads", label: "Lead" },
      { href: "/admin/crm/customers", label: "Khách hàng" },
      { href: "/admin/crm/revenue-categories", label: "Nhóm doanh thu", financial: true },
    ],
  },
  {
    label: "Báo giá",
    financial: true,
    items: [
      { href: "/admin/quotes", label: "Danh sách báo giá", financial: true },
      { href: "/admin/quotes/new", label: "Tạo báo giá", financial: true },
    ],
  },
  {
    label: "Nguyên phụ liệu",
    items: [
      { href: "/admin/materials", label: "Vật tư" },
      { href: "/admin/material-suppliers", label: "Nhà cung cấp NPL" },
      { href: "/admin/materials/warehouse", label: "Tồn kho vật tư" },
      { href: "/admin/purchase-requests", label: "Yêu cầu mua hàng" },
    ],
  },
  {
    label: "Đơn hàng",
    items: [
      { href: "/admin/operations", label: "Tổng quan vận hành" },
      { href: "/admin/orders", label: "Đơn hàng" },
      { href: "/admin/production", label: "Sản xuất" },
      { href: "/admin/delivery", label: "Vận hành giao hàng" },
      { href: "/admin/employees", label: "Nhân viên" },
      { href: "/admin/delivery-methods", label: "Hình thức giao hàng" },
      { href: "/admin/delivery-carriers", label: "Đơn vị vận chuyển" },
    ],
  },
  {
    label: "Tính giá",
    financial: true,
    items: [
      { href: "/admin/pricing", label: "Tổng quan", financial: true },
      { href: "/admin/pricing/calculator", label: "Bộ tính giá", financial: true },
      { href: "/admin/pricing/price-groups", label: "Nhóm giá", financial: true },
      { href: "/admin/pricing/product-tiers", label: "Bảng giá sản phẩm", financial: true },
      { href: "/admin/pricing/service-rules", label: "Phí dịch vụ", financial: true },
      { href: "/admin/pricing/history", label: "Lịch sử tính giá", financial: true },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/client-logos", label: "Logo khách hàng" },
      { href: "/admin/case-studies", label: "Dự án tiêu biểu" },
    ],
  },
  {
    label: "Cài đặt",
    items: [
      { href: "/admin/settings/company", label: "Thông tin công ty" },
      { href: "/admin/settings/trust", label: "Chỉ số tin cậy" },
      { href: "/admin/settings/branding", label: "Nhận diện thương hiệu" },
      { href: "/admin/settings/homepage", label: "Nội dung trang chủ" },
      { href: "/admin/demo", label: "🎭 Dữ liệu demo" },
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
      items: group.items.filter((item) => {
        if (!permissions.canViewFinancials && (group.financial || item.financial)) {
          return false;
        }
        return true;
      }),
    })).filter((group) => group.items.length > 0);
  }, [permissions.canViewFinancials]);

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
