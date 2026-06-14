"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import AttdLogo from "@/components/public/AttdLogo";
import NavMegaMenuPanel from "@/components/public/NavMegaMenu";
import MobileNavPanel from "@/components/public/MobileNavPanel";
import {
  NAV_MEGA_MENUS,
  NAV_DEALER_LINK,
  NAV_CONTACT_LINK,
} from "@/lib/navConfig";
import { CTA } from "@/lib/ctaConfig";

type HeaderProps = {
  headerLogoUrl?: string | null;
  companyTagline?: string;
};

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
      <header className={`site-header${scrolled ? " site-header--scrolled" : ""}`}>
        <div className="container">
          <div className="site-header-inner">
            <AttdLogo variant="desktop" src={headerLogoUrl} className="site-header-logo-desktop" />
            <AttdLogo variant="mobile" src={headerLogoUrl} className="site-header-logo-mobile" />

            <nav className="site-nav-center" aria-label="Main navigation">
              {NAV_MEGA_MENUS.map((item) => (
                <NavMegaMenuPanel key={item.id} item={item} />
              ))}
              <Link href={NAV_DEALER_LINK.href} className="site-nav-link">
                {NAV_DEALER_LINK.label}
              </Link>
            </nav>

            <div className="site-nav-actions">
              <Link href={NAV_CONTACT_LINK.href} className="site-nav-link">
                {NAV_CONTACT_LINK.label}
              </Link>
              <TrackedLink
                href={CTA.primary.href}
                trackEvent={CTA.primary.event}
                trackSource="HEADER"
                className="btn-primary site-nav-cta"
              >
                {CTA.primary.label}
              </TrackedLink>
            </div>

            <button
              type="button"
              aria-label="Mở menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="site-nav-toggle"
            >
              <Menu size={20} />
            </button>
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
