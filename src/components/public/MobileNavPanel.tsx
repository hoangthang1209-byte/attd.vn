"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X, Phone, MessageCircle } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import TrackedAnchor from "@/components/analytics/TrackedAnchor";
import AttdLogo from "@/components/public/AttdLogo";
import { trackInferredPublicLinkClick, trackViewCatalog } from "@/lib/analytics";
import { NAV_PRIMARY_LINKS } from "@/lib/navConfig";
import type { PublicSiteNavigation } from "@/features/site-navigation/site-navigation.types";
import PublicNavMenuLink from "@/components/public/PublicNavMenuLink";
import {
  getHotlineTel,
  getHotlineDisplay,
  getZaloUrl,
} from "@/lib/companyInfo";
import { CTA } from "@/lib/ctaConfig";
import { companyInfo } from "@/lib/companyInfo";

type MobileNavPanelProps = {
  open: boolean;
  onClose: () => void;
  headerLogoUrl?: string | null;
  companyTagline?: string;
  siteNavigation?: PublicSiteNavigation;
};

export default function MobileNavPanel({
  open,
  onClose,
  headerLogoUrl,
  companyTagline,
  siteNavigation,
}: MobileNavPanelProps) {
  const pathname = usePathname();
  const menuScrollRef = useRef<HTMLElement>(null);
  const isNavLinkActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  );

  const mobileMenuLinks = siteNavigation?.mobileMenuLinks ?? NAV_PRIMARY_LINKS.map((link) => ({
    id: link.href,
    href: link.href,
    label: link.label,
    openInNewTab: false,
  }));
  const mobilePrimaryCta = siteNavigation?.ctas.MOBILE_NAV_SECONDARY ?? {
    href: CTA.primary.href,
    label: CTA.primary.label,
    trackEvent: CTA.primary.event,
    openInNewTab: false,
  };
  const mobileSecondaryCta = siteNavigation?.ctas.MOBILE_NAV_PRIMARY ?? {
    href: "/lien-he",
    label: "Liên hệ báo giá",
    trackEvent: "contact_quote",
    openInNewTab: false,
  };

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && open) handleClose();
    }
    if (open) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, handleClose]);

  return (
    <>
      <div
        className={`mobile-nav-backdrop${open ? " mobile-nav-backdrop--open" : ""}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className={`mobile-nav-panel${open ? " mobile-nav-panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu điều hướng"
        aria-hidden={!open}
      >
        <div className="mobile-nav-header">
          <div className="mobile-nav-brand">
            <AttdLogo variant="mobile" src={headerLogoUrl} onClick={handleClose} />
            <p className="mobile-nav-tagline">{companyTagline ?? companyInfo.tagline}</p>
          </div>
          <button
            type="button"
            className="mobile-nav-close"
            onClick={handleClose}
            aria-label="Đóng menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="mobile-nav-body" ref={menuScrollRef} aria-label="Mobile navigation">
          <Link
            href="/san-pham"
            className={`mobile-nav-sublink mobile-nav-sublink--primary mobile-nav-sublink--top${isNavLinkActive("/san-pham") ? " mobile-nav-sublink--active" : ""}`}
            aria-current={isNavLinkActive("/san-pham") ? "page" : undefined}
            onClick={() => {
              trackViewCatalog("mobile_nav", "/san-pham");
              handleClose();
            }}
          >
            Xem danh mục sản phẩm
          </Link>

          {mobileMenuLinks.map((link) => (
            <PublicNavMenuLink
              key={link.id}
              link={link}
              variant="mobile"
              isActive={isNavLinkActive}
              onNavigate={() => {
                trackInferredPublicLinkClick(link.href, "mobile_nav");
                handleClose();
              }}
              onChildNavigate={() => {
                handleClose();
              }}
            />
          ))}
        </nav>

        <div className="mobile-nav-footer">
          <div className="mobile-nav-cta-block">
            <TrackedLink
              href={mobilePrimaryCta.href}
              trackEvent={(mobilePrimaryCta.trackEvent as "dealer_registration_click") ?? "dealer_registration_click"}
              trackSource="MOBILE_NAV"
              className="btn-primary mobile-nav-cta"
              onClick={handleClose}
            >
              {mobilePrimaryCta.label}
            </TrackedLink>
            <TrackedLink
              href={mobileSecondaryCta.href}
              trackEvent={(mobileSecondaryCta.trackEvent as "contact_quote") ?? "contact_quote"}
              trackSource="MOBILE_NAV"
              className="btn-secondary mobile-nav-cta"
              onClick={handleClose}
            >
              {mobileSecondaryCta.label}
            </TrackedLink>
          </div>

          <div className="mobile-nav-contact">
            <TrackedAnchor
              href={`tel:${getHotlineTel()}`}
              trackEvent="contact_hotline"
              trackSource="mobile_nav"
              className="mobile-nav-contact-link"
            >
              <Phone size={18} />
              Hotline {getHotlineDisplay()}
            </TrackedAnchor>
            <TrackedAnchor
              href={getZaloUrl()}
              trackEvent="contact_zalo"
              trackSource="mobile_nav"
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-nav-contact-link"
            >
              <MessageCircle size={18} />
              Chat Zalo
            </TrackedAnchor>
          </div>
        </div>
      </div>
    </>
  );
}
