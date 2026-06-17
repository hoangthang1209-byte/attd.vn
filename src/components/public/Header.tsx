"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import AttdLogo from "@/components/public/AttdLogo";
import NavMegaMenuPanel from "@/components/public/NavMegaMenu";
import MobileNavPanel from "@/components/public/MobileNavPanel";
import MarketplaceSearchBar from "@/components/marketplace/MarketplaceSearchBar";
import MarketplaceCategoryNav from "@/components/marketplace/MarketplaceCategoryNav";
import { NAV_SAN_PHAM_MENU } from "@/lib/navConfig";
import { CTA } from "@/lib/ctaConfig";

type HeaderProps = {
  headerLogoUrl?: string | null;
  companyTagline?: string;
};

const MEGA_MENU = { ...NAV_SAN_PHAM_MENU, label: "Tất cả danh mục" };

export default function Header({ headerLogoUrl, companyTagline }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className={`mp-header${scrolled ? " mp-header--scrolled" : ""}`}>
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
          <div className="mp-header-main">
            <AttdLogo variant="desktop" src={headerLogoUrl} className="site-header-logo-desktop" />
            <AttdLogo variant="mobile" src={headerLogoUrl} className="site-header-logo-mobile" />

            <div className="mp-header-search-desktop">
              <MarketplaceSearchBar />
            </div>

            <div className="mp-header-actions">
              <TrackedLink
                href="/lien-he"
                trackEvent="contact_quote"
                trackSource="HEADER"
                className="btn-secondary mp-header-cta-secondary"
              >
                Liên hệ báo giá
              </TrackedLink>
              <TrackedLink
                href={CTA.primary.href}
                trackEvent={CTA.primary.event}
                trackSource="HEADER"
                className="btn-primary mp-header-cta-primary"
              >
                Đăng ký đại lý
              </TrackedLink>
            </div>

            <button
              type="button"
              aria-label="Mở menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="site-nav-toggle mp-header-menu-btn"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="mp-header-search-mobile">
            <MarketplaceSearchBar />
          </div>
        </div>

        <div className="mp-header-cats">
          <div className="container mp-header-cats-inner">
            <NavMegaMenuPanel item={MEGA_MENU} />
            <MarketplaceCategoryNav />
          </div>
        </div>
      </header>

      <MobileNavPanel
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        headerLogoUrl={headerLogoUrl}
        companyTagline={companyTagline}
      />
    </>
  );
}
