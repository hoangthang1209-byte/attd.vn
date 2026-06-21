"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import AdminScrollRestoration from "@/components/admin/AdminScrollRestoration";
import { AdminTitleProvider, useAdminTitle } from "@/components/admin/AdminTitleContext";

const NAV_GROUPS = [
  {
    label: null as string | null,
    items: [{ href: "/admin/dashboard", label: "Tổng quan" }],
  },
  {
    label: "Sản phẩm",
    items: [
      { href: "/admin/products", label: "Danh sách sản phẩm" },
      { href: "/admin/products/new", label: "Thêm sản phẩm" },
      { href: "/admin/products/import", label: "Nhập Excel/CSV" },
      { href: "/admin/danh-muc", label: "Danh mục sản phẩm" },
      { href: "/admin/products/attributes", label: "Thuộc tính sản phẩm" },
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
    ],
  },
  {
    label: "Báo giá",
    items: [
      { href: "/admin/quotes", label: "Danh sách báo giá" },
      { href: "/admin/quotes/new", label: "Tạo báo giá" },
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
    ],
  },
  {
    label: "Tính giá",
    items: [
      { href: "/admin/pricing", label: "Tổng quan" },
      { href: "/admin/pricing/calculator", label: "Bộ tính giá" },
      { href: "/admin/pricing/price-groups", label: "Nhóm giá" },
      { href: "/admin/pricing/product-tiers", label: "Bảng giá sản phẩm" },
      { href: "/admin/pricing/service-rules", label: "Phí dịch vụ" },
      { href: "/admin/pricing/history", label: "Lịch sử tính giá" },
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

  return (
    <nav className="admin-nav">
      {NAV_GROUPS.map((group) => (
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
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return children;
  }

  return (
    <AdminTitleProvider>
      <div className="admin-app-shell admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-top">
            <Link href="/admin/dashboard" scroll={false} className="admin-brand">
              ATTD CMS
            </Link>
            <AdminLogoutButton />
          </div>
          <Suspense fallback={null}>
            <AdminShellNav />
          </Suspense>
        </aside>
        <AdminShellMain>{children}</AdminShellMain>
      </div>
    </AdminTitleProvider>
  );
}
