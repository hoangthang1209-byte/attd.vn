"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X, ChevronDown, Phone, MessageCircle } from "lucide-react";
import Image from "next/image";
import TrackedLink from "@/components/analytics/TrackedLink";
import AttdLogo from "@/components/public/AttdLogo";
import { NAV_PRIMARY_LINKS } from "@/lib/navConfig";
import type { MarketplaceCategoryTreeNode } from "@/features/categories/marketplace-category-tree";
import {
  getHotlineTel,
  getHotlineDisplay,
  getZaloUrl,
} from "@/lib/companyInfo";
import { CTA } from "@/lib/ctaConfig";
import { companyInfo } from "@/lib/companyInfo";
import { isValidImageSrc } from "@/lib/imagePaths";

type MobileNavPanelProps = {
  open: boolean;
  onClose: () => void;
  headerLogoUrl?: string | null;
  companyTagline?: string;
  categoryTree?: MarketplaceCategoryTreeNode[];
};

export default function MobileNavPanel({
  open,
  onClose,
  headerLogoUrl,
  companyTagline,
  categoryTree = [],
}: MobileNavPanelProps) {
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
          <div className="mobile-nav-brand">
            <AttdLogo variant="mobile" src={headerLogoUrl} onClick={onClose} />
            <p className="mobile-nav-tagline">{companyTagline ?? companyInfo.tagline}</p>
          </div>
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
          <Link
            href="/san-pham"
            className="mobile-nav-sublink mobile-nav-sublink--primary mobile-nav-sublink--top"
            onClick={onClose}
          >
            Xem danh mục sản phẩm →
          </Link>

          {categoryTree.length > 0 && (
            <details className="mobile-nav-accordion mobile-nav-accordion--categories">
              <summary className="mobile-nav-accordion-trigger">
                Danh mục nguồn hàng
                <ChevronDown size={18} className="mobile-nav-accordion-icon" />
              </summary>
              <div className="mobile-nav-accordion-content">
                {categoryTree.map((parent) => (
                  <details key={parent.id} className="mobile-nav-category-group">
                    <summary className="mobile-nav-category-parent">
                      {parent.name}
                      {parent.productCount > 0 && (
                        <span className="mobile-nav-category-count">
                          {parent.productCount}
                        </span>
                      )}
                      <ChevronDown size={16} className="mobile-nav-accordion-icon" />
                    </summary>
                    <div className="mobile-nav-category-children">
                      {parent.children.map((child) => (
                        <Link
                          key={child.id}
                          href={child.href}
                          className="mobile-nav-category-child"
                          onClick={onClose}
                        >
                          <span className="mobile-nav-category-child-img">
                            {child.imageUrl && isValidImageSrc(child.imageUrl) ? (
                              <Image
                                src={child.imageUrl}
                                alt=""
                                fill
                                className="mobile-nav-category-child-photo"
                                sizes="48px"
                              />
                            ) : (
                              <span className="mobile-nav-category-child-fallback" />
                            )}
                          </span>
                          <span className="mobile-nav-category-child-label">
                            {child.name}
                          </span>
                        </Link>
                      ))}
                      <Link
                        href={parent.viewAllHref}
                        className="mobile-nav-category-view-all"
                        onClick={onClose}
                      >
                        Xem tất cả {parent.name} →
                      </Link>
                    </div>
                  </details>
                ))}
              </div>
            </details>
          )}

          {NAV_PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="mobile-nav-sublink mobile-nav-sublink--solo"
              onClick={onClose}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mobile-nav-footer">
          <div className="mobile-nav-cta-block">
            <TrackedLink
              href={CTA.primary.href}
              trackEvent={CTA.primary.event}
              trackSource="MOBILE_NAV"
              className="btn-primary mobile-nav-cta"
              onClick={onClose}
            >
              {CTA.primary.label}
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
          </div>

          <div className="mobile-nav-contact">
            <a href={`tel:${getHotlineTel()}`} className="mobile-nav-contact-link">
              <Phone size={18} />
              Hotline {getHotlineDisplay()}
            </a>
            <a
              href={getZaloUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-nav-contact-link"
            >
              <MessageCircle size={18} />
              Chat Zalo
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
