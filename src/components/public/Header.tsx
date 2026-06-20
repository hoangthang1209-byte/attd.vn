"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import AttdLogo from "@/components/public/AttdLogo";
import MobileNavPanel from "@/components/public/MobileNavPanel";
import MarketplaceSearchBar from "@/components/marketplace/MarketplaceSearchBar";
import MarketplaceMegaCategoryMenu from "@/components/marketplace/MarketplaceMegaCategoryMenu";
import MarketplaceCategoryNav from "@/components/marketplace/MarketplaceCategoryNav";
import type { MarketplaceCategoryTreeNode } from "@/features/categories/marketplace-category-tree";
import { NAV_PRIMARY_LINKS } from "@/lib/navConfig";

const HEADER_SEARCH_PLACEHOLDER = "Tìm áo thun, áo polo, nón, quà tặng…";

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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function openMobileMenu() {
    setMobileSearchOpen(false);
    setMobileOpen(true);
  }

  return (
    <>
      <header className={`mp-header mp-header--v271${scrolled ? " mp-header--scrolled" : ""}`}>
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
              onClick={() => setMobileSearchOpen((open) => !open)}
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
            <MarketplaceSearchBar placeholder={HEADER_SEARCH_PLACEHOLDER} />
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
      />
    </>
  );
}
