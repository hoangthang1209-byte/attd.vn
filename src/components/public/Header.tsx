"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, Search, X, LayoutGrid } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import AttdLogo from "@/components/public/AttdLogo";
import MobileNavPanel from "@/components/public/MobileNavPanel";
import MobileCategoryExplorerPanel from "@/components/public/MobileCategoryExplorerPanel";
import MarketplaceSearchBar from "@/components/marketplace/MarketplaceSearchBar";
import MarketplaceMegaCategoryMenu from "@/components/marketplace/MarketplaceMegaCategoryMenu";
import MarketplaceCategoryNav from "@/components/marketplace/MarketplaceCategoryNav";
import type { MarketplaceCategoryTreeNode } from "@/features/categories/marketplace-category-tree";
import type { PublicSiteNavigation } from "@/features/site-navigation/site-navigation.types";
import { flattenPublicNavLinks } from "@/features/site-navigation/public-nav-utils";
import PublicNavMenuLink from "@/components/public/PublicNavMenuLink";
import { NAV_PRIMARY_LINKS } from "@/lib/navConfig";
import { MARKETPLACE_CATEGORY_NAV } from "@/lib/navConfig";

const HEADER_SEARCH_PLACEHOLDER_FALLBACK = "Tìm áo thun, áo polo, nón, quà tặng…";

function MobileNavCategorySlugEffect({
  onCategoryChange,
}: {
  onCategoryChange: (slug: string | null) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname === "/san-pham") {
      onCategoryChange(searchParams.get("category"));
    } else {
      onCategoryChange(null);
    }
  }, [pathname, searchParams, onCategoryChange]);

  return null;
}

function MobileOverlayRouteCloseEffect({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const prevRouteRef = useRef(routeKey);

  useEffect(() => {
    if (prevRouteRef.current === routeKey) return;
    prevRouteRef.current = routeKey;
    onClose();
  }, [routeKey, onClose]);

  return null;
}

type HeaderProps = {
  headerLogoUrl?: string | null;
  companyTagline?: string;
  categoryTree?: MarketplaceCategoryTreeNode[];
  siteNavigation?: PublicSiteNavigation;
};

export default function Header({
  headerLogoUrl,
  companyTagline,
  categoryTree = [],
  siteNavigation,
}: HeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchToggleRef = useRef<HTMLButtonElement>(null);
  const categoryAccessRef = useRef<HTMLButtonElement>(null);

  const showMobileCategoryTrigger = categoryTree.length > 0;
  const utilityBarLinks = siteNavigation
    ? flattenPublicNavLinks(siteNavigation.utilityBarLinks)
    : [
        { href: "/dai-ly", label: "Đại lý" },
        { href: "/oem", label: "OEM" },
        { href: "/lien-he", label: "Liên hệ" },
      ];
  const headerMenuLinks = siteNavigation?.headerMenuLinks ?? NAV_PRIMARY_LINKS.map((link) => ({
    id: link.href,
    href: link.href,
    label: link.label,
    openInNewTab: false,
  }));
  const categoryNavLinks = siteNavigation
    ? flattenPublicNavLinks(siteNavigation.categoryNavLinks)
    : MARKETPLACE_CATEGORY_NAV;
  const searchPlaceholder =
    siteNavigation?.settings.searchPlaceholder ?? HEADER_SEARCH_PLACEHOLDER_FALLBACK;
  const utilityTagline =
    siteNavigation?.settings.utilityTagline ?? "Kho sỉ đồng phục & quà tặng doanh nghiệp";
  const megaMenuTriggerLabel =
    siteNavigation?.settings.megaMenuTriggerLabel ?? "Tất cả danh mục";
  const headerCta = siteNavigation?.ctas.HEADER_PRIMARY ?? {
    id: "header-cta-fallback",
    href: "/lien-he",
    label: "Liên hệ báo giá sỉ",
    openInNewTab: false,
    trackEvent: "contact_quote",
  };
  const isNavLinkActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  );

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    function syncHeaderStackHeight() {
      const el = headerRef.current;
      if (!el) return;
      // Publish on :root so PDP sticky tabs / scroll-margin (siblings of header) inherit the live height.
      const height = `${el.offsetHeight}px`;
      el.style.setProperty("--mp-header-stack-height", height);
      document.documentElement.style.setProperty("--mp-header-stack-height", height);
    }

    syncHeaderStackHeight();
    const observer = new ResizeObserver(syncHeaderStackHeight);
    observer.observe(headerEl);
    window.addEventListener("resize", syncHeaderStackHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeaderStackHeight);
    };
  }, [mobileSearchOpen, showMobileCategoryTrigger]);

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty("--mp-header-stack-height");
    };
  }, []);

  useEffect(() => {
    if (!mobileSearchOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileSearchOpen(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileSearchOpen]);

  const closeMobileSearch = useCallback(() => {
    setMobileSearchOpen(false);
    mobileSearchInputRef.current?.blur();
    window.requestAnimationFrame(() => {
      mobileSearchToggleRef.current?.focus();
    });
  }, []);

  const closeMobileCategory = useCallback(() => {
    setMobileCategoryOpen(false);
  }, []);

  const handleCategorySlugChange = useCallback((slug: string | null) => {
    setActiveCategorySlug(slug);
  }, []);

  function openMobileMenu() {
    closeMobileSearch();
    setMobileCategoryOpen(false);
    setMobileOpen(true);
  }

  function openMobileCategoryExplorer() {
    closeMobileSearch();
    setMobileOpen(false);
    setMobileCategoryOpen(true);
  }

  function toggleMobileSearch() {
    setMobileOpen(false);
    setMobileCategoryOpen(false);
    setMobileSearchOpen((open) => !open);
  }

  return (
    <>
      <Suspense fallback={null}>
        <MobileOverlayRouteCloseEffect onClose={closeMobileSearch} />
        <MobileOverlayRouteCloseEffect onClose={closeMobileCategory} />
        <MobileNavCategorySlugEffect onCategoryChange={handleCategorySlugChange} />
      </Suspense>
      <header
        ref={headerRef}
        className={`mp-header mp-header--v271${scrolled ? " mp-header--scrolled" : ""}${mobileSearchOpen ? " mp-header--mobile-search-open" : ""}`}
      >
        <div className="mp-header-top">
          <div className="container mp-header-top-inner">
            <p className="mp-header-tagline">{utilityTagline}</p>
            <div className="mp-header-top-links">
              {utilityBarLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  target={link.openInNewTab ? "_blank" : undefined}
                  rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="container">
          <div className="mp-header-main mp-header-main--search-first">
            <AttdLogo variant="desktop" src={headerLogoUrl} className="site-header-logo-desktop" />

            <div className="mp-header-mega mp-header-cats-container">
              <MarketplaceMegaCategoryMenu
                categories={categoryTree}
                showCategoryNav={false}
                triggerLabel={megaMenuTriggerLabel}
              />
            </div>

            <div className="mp-header-search-desktop">
              <MarketplaceSearchBar placeholder={searchPlaceholder} />
            </div>

            <nav className="mp-header-primary-nav" aria-label="Điều hướng chính">
              {headerMenuLinks.map((link) => (
                <PublicNavMenuLink
                  key={link.id}
                  link={link}
                  variant="header"
                  isActive={isNavLinkActive}
                />
              ))}
            </nav>

            <div className="mp-header-actions">
              <TrackedLink
                href={headerCta.href}
                trackEvent={(headerCta.trackEvent as "contact_quote") ?? "contact_quote"}
                trackSource="HEADER"
                className="btn-primary mp-header-cta-primary"
                target={headerCta.openInNewTab ? "_blank" : undefined}
                rel={headerCta.openInNewTab ? "noopener noreferrer" : undefined}
              >
                {headerCta.label}
              </TrackedLink>
            </div>

            <div className="mp-header-mobile-row">
              <div className="mp-header-mobile-row__side mp-header-mobile-row__side--left">
                {showMobileCategoryTrigger ? (
                  <button
                    ref={categoryAccessRef}
                    type="button"
                    className="mp-header-mobile-cat-btn"
                    aria-label="Mở tất cả danh mục"
                    onClick={openMobileCategoryExplorer}
                  >
                    <LayoutGrid size={18} aria-hidden />
                    <span>Danh mục</span>
                  </button>
                ) : (
                  <span className="mp-header-mobile-row__spacer" aria-hidden="true" />
                )}
              </div>

              <AttdLogo
                variant="mobile"
                src={headerLogoUrl}
                className="site-header-logo-mobile mp-header-mobile-logo"
              />

              <div className="mp-header-mobile-row__side mp-header-mobile-row__side--right">
                <button
                  ref={mobileSearchToggleRef}
                  type="button"
                  aria-label="Mở tìm kiếm"
                  aria-expanded={mobileSearchOpen}
                  onClick={toggleMobileSearch}
                  className="mp-header-search-toggle"
                >
                  <Search size={20} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Mở menu"
                  aria-expanded={mobileOpen}
                  onClick={openMobileMenu}
                  className="site-nav-toggle mp-header-menu-btn"
                >
                  <Menu size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {mobileSearchOpen && (
          <div className="mp-header-mobile-search-panel">
            <div className="container">
              <div className="mp-header-search-mobile__row">
                <div className="mp-header-search-mobile__field">
                  <MarketplaceSearchBar
                    variant="mobile-header"
                    placeholder={searchPlaceholder}
                    autoFocus
                    inputRef={mobileSearchInputRef}
                    onSubmitNavigate={closeMobileSearch}
                  />
                </div>
                <button
                  type="button"
                  className="mp-header-search-close"
                  aria-label="Đóng tìm kiếm"
                  onClick={closeMobileSearch}
                >
                  <X size={20} aria-hidden />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mp-header-cats mp-header-cats--desktop">
          <div className="container mp-header-cats-scroll-row">
            <MarketplaceCategoryNav links={categoryNavLinks} />
          </div>
        </div>
      </header>

      <MobileNavPanel
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        headerLogoUrl={headerLogoUrl}
        companyTagline={companyTagline}
        siteNavigation={siteNavigation}
      />

      <MobileCategoryExplorerPanel
        open={mobileCategoryOpen}
        onClose={closeMobileCategory}
        categoryTree={categoryTree}
        activeCategorySlug={activeCategorySlug}
        restoreFocusRef={categoryAccessRef}
      />
    </>
  );
}
