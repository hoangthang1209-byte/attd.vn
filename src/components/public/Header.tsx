"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import NavDropdownMenu from "@/components/public/NavDropdownMenu";
import MobileNavPanel from "@/components/public/MobileNavPanel";
import {
  NAV_DROPDOWNS,
  NAV_DEALER_LINK,
  NAV_CONTACT_LINK,
} from "@/lib/navConfig";

export default function Header() {
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
            <Link href="/" className="site-logo">
              ATTD
            </Link>

            <nav className="site-nav-center" aria-label="Main navigation">
              {NAV_DROPDOWNS.map((item) => (
                <NavDropdownMenu key={item.id} item={item} />
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
                href="/dai-ly"
                trackEvent="dealer_registration_click"
                trackSource="HEADER"
                className="btn-primary site-nav-cta"
              >
                Đăng ký đại lý
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

      <MobileNavPanel open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
