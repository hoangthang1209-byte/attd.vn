"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X, ChevronDown, Phone, MessageCircle } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import {
  NAV_DROPDOWNS,
  CONTACT_HOTLINE,
  CONTACT_HOTLINE_DISPLAY,
  CONTACT_ZALO_URL,
} from "@/lib/navConfig";

type MobileNavPanelProps = {
  open: boolean;
  onClose: () => void;
};

export default function MobileNavPanel({ open, onClose }: MobileNavPanelProps) {
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
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`mobile-nav-backdrop${open ? " mobile-nav-backdrop--open" : ""}`}
        onClick={onClose}
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
          <Link href="/" className="site-logo" onClick={onClose}>
            ATTD
          </Link>
          <button
            type="button"
            className="mobile-nav-close"
            onClick={onClose}
            aria-label="Đóng menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="mobile-nav-body" aria-label="Mobile navigation">
          {NAV_DROPDOWNS.map((section) => (
            <details key={section.id} className="mobile-nav-accordion">
              <summary className="mobile-nav-accordion-trigger">
                {section.label}
                <ChevronDown size={18} className="mobile-nav-accordion-icon" />
              </summary>
              <div className="mobile-nav-accordion-content">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="mobile-nav-sublink"
                    onClick={onClose}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </details>
          ))}

          <Link href="/dai-ly" className="mobile-nav-sublink mobile-nav-sublink--solo" onClick={onClose}>
            Đại lý
          </Link>
        </nav>

        <div className="mobile-nav-footer">
          <TrackedLink
            href="/dai-ly"
            trackEvent="dealer_registration_click"
            trackSource="MOBILE_NAV"
            className="btn-primary mobile-nav-cta"
            onClick={onClose}
          >
            Đăng ký đại lý
          </TrackedLink>
          <TrackedLink
            href="/lien-he"
            trackEvent="contact_quote"
            trackSource="MOBILE_NAV"
            className="btn-secondary mobile-nav-cta"
            onClick={onClose}
          >
            Liên hệ báo giá
          </TrackedLink>

          <div className="mobile-nav-contact">
            <a href={`tel:${CONTACT_HOTLINE}`} className="mobile-nav-contact-link">
              <Phone size={16} />
              Hotline {CONTACT_HOTLINE_DISPLAY}
            </a>
            <a
              href={CONTACT_ZALO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-nav-contact-link"
            >
              <MessageCircle size={16} />
              Chat Zalo
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
