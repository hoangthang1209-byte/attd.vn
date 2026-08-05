"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import AdminScrollRestoration from "@/components/admin/AdminScrollRestoration";
import AdminCommandPalette from "@/components/admin/AdminCommandPalette";
import { AdminTitleProvider, useAdminTitle } from "@/components/admin/AdminTitleContext";
import { useAdminPermissions, type AdminPermissionFlags } from "@/components/admin/AdminPermissionsContext";
import { WorkspaceModeProvider, useWorkspaceMode } from "@/components/admin/content/WorkspaceModeContext";
import {
  adminDashboardNavItem,
  adminNavigationSections,
  filterNavigationForWorkspaceMode,
  type AdminNavigationItem,
} from "@/lib/admin/admin-navigation";
import { getAdminBreadcrumbMeta } from "@/lib/admin/admin-breadcrumbs";
import styles from "./AdminShell.module.css";

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
  const { permissions, loading } = useAdminPermissions();
  const { isSolo } = useWorkspaceMode();

  const visibleNavigation = useMemo(() => {
    if (loading) {
      return { dashboard: null, sections: [] as typeof adminNavigationSections };
    }
    const dashboard =
      adminDashboardNavItem.status !== "hidden" &&
      hasRequiredPermissions(permissions, adminDashboardNavItem.requiredPermissions)
        ? adminDashboardNavItem
        : null;

    const modeFilteredSections = filterNavigationForWorkspaceMode(adminNavigationSections, isSolo);

    const sections = modeFilteredSections
      .map((section) => ({
        ...section,
        platforms: section.platforms
          .filter((platform) => hasRequiredPermissions(permissions, platform.requiredPermissions))
          .map((platform) => ({
            ...platform,
            items: platform.items.filter(
              (item) =>
                item.status === "active" &&
                Boolean(item.href) &&
                hasRequiredPermissions(permissions, item.requiredPermissions),
            ),
          }))
          .filter((platform) => platform.items.length > 0),
      }))
      .filter((section) => section.platforms.length > 0);

    return { dashboard, sections };
  }, [permissions, loading, isSolo]);

  return (
    <nav className={styles.nav}>
      {visibleNavigation.dashboard ? (
        <div className={styles.navGroup}>
          <AdminNavItem item={visibleNavigation.dashboard} pathname={pathname} searchParams={searchParams} />
        </div>
      ) : null}
      {visibleNavigation.sections.map((section) => (
        <section key={section.label} className={styles.navSection} aria-labelledby={`admin-nav-${section.label}`}>
          <p id={`admin-nav-${section.label}`} className={styles.sectionLabel}>
            <span className={styles.sectionIcon} aria-hidden="true">{section.icon}</span>
            {section.label}
          </p>
          {section.platforms.map((platform, platformIndex) => (
            <div key={`${section.label}:${platform.label || platformIndex}`} className={styles.navGroup}>
              {platform.label ? <p className={styles.groupLabel}>{platform.label}</p> : null}
              {platform.items.map((item) => (
                <AdminNavItem
                  key={item.href ?? `${section.label}:${item.label}`}
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
      <span
        className={`${styles.navLink} ${styles.navLinkDisabled}`}
        aria-disabled="true"
        title="Sắp ra mắt"
      >
        <span>{item.label}</span>
        <span className={styles.comingSoon}>Sắp ra mắt</span>
      </span>
    );
  }

  const active = isNavItemActive(item.href, pathname, searchParams);
  return (
    <Link
      href={item.href}
      scroll={false}
      prefetch
      className={`${styles.navLink}${active ? ` ${styles.navLinkActive}` : ""}`}
    >
      {item.label}
    </Link>
  );
}

/** Sprint 19.0 — compact Solo/Team + Developer Mode control mounted in the shell header. */
function WorkspaceModeToggle() {
  const { mode, developerMode, toggleMode, toggleDeveloperMode } = useWorkspaceMode();

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 6 }}
      title="Solo ẩn bớt màn hình vận hành nâng cao. Developer Mode hiện thông số kỹ thuật AI."
    >
      <button
        type="button"
        onClick={toggleMode}
        aria-pressed={mode === "team"}
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid #e2e8f0",
          background: mode === "solo" ? "#eef2ff" : "#f8fafc",
          color: mode === "solo" ? "#4338ca" : "#475569",
          cursor: "pointer",
        }}
      >
        {mode === "solo" ? "Solo" : "Team"}
      </button>
      <button
        type="button"
        onClick={toggleDeveloperMode}
        aria-pressed={developerMode}
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid #e2e8f0",
          background: developerMode ? "#fef3c7" : "#f8fafc",
          color: developerMode ? "#92400e" : "#475569",
          cursor: "pointer",
        }}
      >
        Dev {developerMode ? "ON" : "OFF"}
      </button>
    </div>
  );
}

function AdminShellMain({
  children,
  onOpenNav,
}: {
  children: React.ReactNode;
  onOpenNav: () => void;
}) {
  const pathname = usePathname();
  const { title } = useAdminTitle();
  const pageMeta = getAdminBreadcrumbMeta(pathname);
  const pageTitle = title || pageMeta.title;

  return (
    <main id="admin-content-scroll" className={`${styles.main} admin-content-scroll`}>
      <Suspense fallback={null}>
        <AdminScrollRestoration />
      </Suspense>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.mobileHeaderToggle}
          onClick={onOpenNav}
          aria-controls="admin-primary-navigation"
          aria-label="Mở menu quản trị"
        >
          <Menu size={20} />
        </button>
        <div className={styles.headerBody}>
          <div className={styles.breadcrumbs} aria-label="Breadcrumb">
            {pageMeta.breadcrumbs.map((breadcrumb) => (
              <span key={breadcrumb} className={styles.breadcrumbItem}>{breadcrumb}</span>
            ))}
          </div>
          <h1 className={styles.title}>{pageTitle}</h1>
          <p className={styles.description}>{pageMeta.description}</p>
        </div>
        <div className={styles.headerActions}>
          <WorkspaceModeToggle />
          <span className={styles.statusPill}>
            <span className={styles.statusDot} aria-hidden="true" />
            IA v2.0
          </span>
        </div>
      </header>
      <div className={`${styles.content} admin-main-content`}>{children}</div>
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
    <WorkspaceModeProvider>
      <AdminTitleProvider>
        <AdminCommandPalette />
        <div className={styles.shell}>
          {mobileNavOpen ? (
            <button
              type="button"
              className={styles.mobileOverlay}
              onClick={() => setMobileNavOpen(false)}
              aria-label="Đóng menu quản trị"
            />
          ) : null}
          <aside
            className={`${styles.sidebar}${mobileNavOpen ? ` ${styles.sidebarOpen}` : ""}`}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) {
                setMobileNavOpen(false);
              }
            }}
          >
            <div className={styles.sidebarTop}>
              <Link href="/admin/dashboard" scroll={false} className={styles.brand}>
                <span className={styles.brandMark}>ATTD CMS</span>
                <span className={styles.brandSub}>Design Authority</span>
              </Link>
              <div className={styles.sidebarActions}>
                <AdminLogoutButton />
                <button
                  type="button"
                  className={styles.mobileToggle}
                  onClick={() => setMobileNavOpen((current) => !current)}
                  aria-expanded={mobileNavOpen}
                  aria-controls="admin-primary-navigation"
                  aria-label={mobileNavOpen ? "Đóng menu quản trị" : "Mở menu quản trị"}
                >
                  {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>
            </div>
            <div id="admin-primary-navigation" className={styles.navWrap}>
              <Suspense fallback={null}>
                <AdminShellNav />
              </Suspense>
            </div>
          </aside>
          <AdminShellMain onOpenNav={() => setMobileNavOpen(true)}>{children}</AdminShellMain>
        </div>
      </AdminTitleProvider>
    </WorkspaceModeProvider>
  );
}
