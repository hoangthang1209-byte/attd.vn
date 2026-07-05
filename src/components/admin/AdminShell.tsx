"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import AdminScrollRestoration from "@/components/admin/AdminScrollRestoration";
import { AdminTitleProvider, useAdminTitle } from "@/components/admin/AdminTitleContext";
import { useAdminPermissions, type AdminPermissionFlags } from "@/components/admin/AdminPermissionsContext";
import {
  adminDashboardNavItem,
  adminNavigationSections,
  type AdminNavigationItem,
} from "@/lib/admin/admin-navigation";

function hasRequiredPermissions(
  permissions: AdminPermissionFlags,
  requiredPermissions?: (keyof AdminPermissionFlags)[],
) {
  if (!requiredPermissions?.length) return true;
  return requiredPermissions.every((permission) => permissions[permission]);
}

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

  const visibleNavigation = useMemo(() => {
    const dashboard =
      adminDashboardNavItem.status !== "hidden" &&
      hasRequiredPermissions(permissions, adminDashboardNavItem.requiredPermissions)
        ? adminDashboardNavItem
        : null;

    const sections = adminNavigationSections
      .map((section) => ({
        ...section,
        platforms: section.platforms
          .filter((platform) => hasRequiredPermissions(permissions, platform.requiredPermissions))
          .map((platform) => ({
            ...platform,
            items: platform.items.filter(
              (item) =>
                item.status !== "hidden" &&
                hasRequiredPermissions(permissions, item.requiredPermissions),
            ),
          }))
          .filter((platform) => platform.items.length > 0),
      }))
      .filter((section) => section.platforms.length > 0);

    return { dashboard, sections };
  }, [permissions]);

  return (
    <nav className="admin-nav">
      {visibleNavigation.dashboard ? (
        <div className="admin-nav-group">
          <AdminNavItem item={visibleNavigation.dashboard} pathname={pathname} searchParams={searchParams} />
        </div>
      ) : null}
      {visibleNavigation.sections.map((section) => (
        <section key={section.label} className="admin-nav-section" aria-labelledby={`admin-nav-${section.label}`}>
          <p id={`admin-nav-${section.label}`} className="admin-nav-section-label">
            <span aria-hidden="true">{section.icon}</span>
            {section.label}
          </p>
          {section.platforms.map((platform) => (
            <div key={platform.label} className="admin-nav-group">
              <p className="admin-nav-group-label">{platform.label}</p>
              {platform.items.map((item) => (
                <AdminNavItem
                  key={`${platform.label}:${item.label}`}
                  item={item}
                  pathname={pathname}
                  searchParams={searchParams}
                />
              ))}
            </div>
          ))}
        </section>
      ))}
    </nav>
  );
}

function AdminNavItem({
  item,
  pathname,
  searchParams,
}: {
  item: AdminNavigationItem;
  pathname: string;
  searchParams: URLSearchParams;
}) {
  if (item.status === "coming-soon" || !item.href) {
    return (
      <span className="admin-nav-link admin-nav-link--disabled" aria-disabled="true" title="Sắp ra mắt">
        <span>{item.label}</span>
        <span className="admin-nav-coming-soon">Sắp ra mắt</span>
      </span>
    );
  }

  const active = isNavItemActive(item.href, pathname, searchParams);
  return (
    <Link
      href={item.href}
      scroll={false}
      prefetch
      className={`admin-nav-link${active ? " admin-nav-link--active" : ""}`}
    >
      {item.label}
    </Link>
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
