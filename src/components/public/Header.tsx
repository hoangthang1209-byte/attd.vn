"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import AttdLogo from "@/components/public/AttdLogo";
import MobileNavPanel from "@/components/public/MobileNavPanel";
import MarketplaceSearchBar from "@/components/marketplace/MarketplaceSearchBar";
import MarketplaceMegaCategoryMenu from "@/components/marketplace/MarketplaceMegaCategoryMenu";
import MarketplaceCategoryNav from "@/components/marketplace/MarketplaceCategoryNav";
import type { MarketplaceCategoryTreeNode } from "@/features/categories/marketplace-category-tree";
import { NAV_PRIMARY_LINKS } from "@/lib/navConfig";

const HEADER_SEARCH_PLACEHOLDER = "Tìm áo thun, áo polo, nón, quà tặng…";

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

function MobileSearchRouteCloseEffect({ onClose }: { onClose: () => void }) {
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
};

export default function Header({
  headerLogoUrl,
  companyTagline,
  categoryTree = [],
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    function syncHeaderStackHeight() {
      const el = headerRef.current;
      if (!el) return;
      el.style.setProperty("--mp-header-stack-height", `${el.offsetHeight}px`);
    }

    syncHeaderStackHeight();
    const observer = new ResizeObserver(syncHeaderStackHeight);
    observer.observe(headerEl);
    window.addEventListener("resize", syncHeaderStackHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeaderStackHeight);
    };
  }, [mobileSearchOpen]);

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
  }, []);

  const handleCategorySlugChange = useCallback((slug: string | null) => {
    setActiveCategorySlug(slug);
  }, []);

  function openMobileMenu() {
    closeMobileSearch();
    setMobileOpen(true);
  }

  function toggleMobileSearch() {
    setMobileOpen(false);
    setMobileSearchOpen((open) => !open);
  }

  return (
    <>
      <Suspense fallback={null}>
        <MobileSearchRouteCloseEffect onClose={closeMobileSearch} />
        <MobileNavCategorySlugEffect onCategoryChange={handleCategorySlugChange} />
      </Suspense>
      <header
        ref={headerRef}
        className={`mp-header mp-header--v271${scrolled ? " mp-header--scrolled" : ""}${mobileSearchOpen ? " mp-header--mobile-search-open" : ""}`}
      >
        <div className="mp-header-top">
          <div className="container mp-header-top-inner">
            <p className="mp-header-tagline">
              Kho sỉ đồng phục &amp; quà tặng doanh nghiệp
            </p>
            <div className="mp-header-top-links">
              <Link href="/dai-ly">Đại lý</Link>
              <Link href="/oem">OEM</Link>
              <Link href="/lien-he">Liên hệ</Link>
            </div>
          </div>
        </div>

        <div className="container">
          <div className="mp-header-main mp-header-main--search-first">
            <AttdLogo variant="desktop" src={headerLogoUrl} className="site-header-logo-desktop" />
            <AttdLogo variant="mobile" src={headerLogoUrl} className="site-header-logo-mobile" />

            <div className="mp-header-mega mp-header-cats-container">
              <MarketplaceMegaCategoryMenu
                categories={categoryTree}
                showCategoryNav={false}
              />
            </div>

            <div className="mp-header-search-desktop">
              <MarketplaceSearchBar placeholder={HEADER_SEARCH_PLACEHOLDER} />
            </div>

            <nav className="mp-header-primary-nav" aria-label="Điều hướng chính">
              {NAV_PRIMARY_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="mp-header-primary-nav-link">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mp-header-actions">
              <TrackedLink
                href="/lien-he"
                trackEvent="contact_quote"
                trackSource="HEADER"
                className="btn-primary mp-header-cta-primary"
              >
                Liên hệ báo giá sỉ
              </TrackedLink>
            </div>

            <button
              type="button"
              aria-label="Tìm sản phẩm"
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

        {mobileSearchOpen && (
          <div className="mp-header-search-mobile container">
            <div className="mp-header-search-mobile__row">
              <div className="mp-header-search-mobile__field">
                <MarketplaceSearchBar
                  variant="mobile-header"
                  placeholder={HEADER_SEARCH_PLACEHOLDER}
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
        )}

        <div className="mp-header-cats mp-header-cats--desktop">
          <div className="container mp-header-cats-scroll-row">
            <MarketplaceCategoryNav />
          </div>
        </div>
      </header>

      <MobileNavPanel
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        headerLogoUrl={headerLogoUrl}
        companyTagline={companyTagline}
        categoryTree={categoryTree}
        activeCategorySlug={activeCategorySlug}
      />
    </>
  );
}
