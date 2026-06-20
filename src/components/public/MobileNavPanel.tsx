"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, Phone, MessageCircle, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import AttdLogo from "@/components/public/AttdLogo";
import MobileCategoryBrowser from "@/components/public/MobileCategoryBrowser";
import { NAV_PRIMARY_LINKS } from "@/lib/navConfig";
import type { MarketplaceCategoryTreeNode } from "@/features/categories/marketplace-category-tree";
import {
  getHotlineTel,
  getHotlineDisplay,
  getZaloUrl,
} from "@/lib/companyInfo";
import { CTA } from "@/lib/ctaConfig";
import { companyInfo } from "@/lib/companyInfo";

type NavView = "menu" | "categories";

type MobileNavPanelProps = {
  open: boolean;
  onClose: () => void;
  headerLogoUrl?: string | null;
  companyTagline?: string;
  categoryTree?: MarketplaceCategoryTreeNode[];
  activeCategorySlug?: string | null;
};

export default function MobileNavPanel({
  open,
  onClose,
  headerLogoUrl,
  companyTagline,
  categoryTree = [],
  activeCategorySlug,
}: MobileNavPanelProps) {
  const [view, setView] = useState<NavView>("menu");
  const [categoriesSessionKey, setCategoriesSessionKey] = useState(0);
  const menuScrollRef = useRef<HTMLElement>(null);
  const menuScrollPos = useRef(0);

  const handleClose = useCallback(() => {
    setView("menu");
    onClose();
  }, [onClose]);

  const goBackToMenu = useCallback(() => {
    setView("menu");
    requestAnimationFrame(() => {
      if (menuScrollRef.current) {
        menuScrollRef.current.scrollTop = menuScrollPos.current;
      }
    });
  }, []);

  const openCategories = useCallback(() => {
    menuScrollPos.current = menuScrollRef.current?.scrollTop ?? 0;
    setCategoriesSessionKey((k) => k + 1);
    setView("categories");
  }, []);

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
      if (e.key !== "Escape") return;
      if (view === "categories") {
        goBackToMenu();
      } else {
        handleClose();
      }
    }
    if (open) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, view, handleClose, goBackToMenu]);

  const hasCategories = categoryTree.length > 0;

  return (
    <>
      <div
        className={`mobile-nav-backdrop${open ? " mobile-nav-backdrop--open" : ""}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className={`mobile-nav-panel${open ? " mobile-nav-panel--open" : ""}${view === "categories" ? " mobile-nav-panel--categories" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={view === "categories" ? "Danh mục nguồn hàng" : "Menu điều hướng"}
        aria-hidden={!open}
      >
        {view === "menu" ? (
          <>
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
                className="mobile-nav-sublink mobile-nav-sublink--primary mobile-nav-sublink--top"
                onClick={handleClose}
              >
                Xem danh mục sản phẩm
              </Link>

              {hasCategories && (
                <button
                  type="button"
                  className="mobile-nav-categories-entry"
                  onClick={openCategories}
                >
                  <span className="mobile-nav-categories-entry__icon" aria-hidden="true">
                    <LayoutGrid size={20} />
                  </span>
                  <span className="mobile-nav-categories-entry__label">Tất cả danh mục</span>
                  <ChevronRight size={18} className="mobile-nav-categories-entry__chevron" aria-hidden="true" />
                </button>
              )}

              {NAV_PRIMARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="mobile-nav-sublink mobile-nav-sublink--solo"
                  onClick={handleClose}
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
                  onClick={handleClose}
                >
                  {CTA.primary.label}
                </TrackedLink>
                <TrackedLink
                  href="/lien-he"
                  trackEvent="contact_quote"
                  trackSource="MOBILE_NAV"
                  className="btn-secondary mobile-nav-cta"
                  onClick={handleClose}
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
          </>
        ) : (
          <>
            <div className="mobile-cat-explorer-header">
              <button
                type="button"
                className="mobile-cat-explorer-header__back"
                onClick={goBackToMenu}
                aria-label="Quay lại menu"
              >
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
              <h2 className="mobile-cat-explorer-header__title">Danh mục nguồn hàng</h2>
              <button
                type="button"
                className="mobile-nav-close mobile-cat-explorer-header__close"
                onClick={handleClose}
                aria-label="Đóng menu"
              >
                <X size={22} />
              </button>
            </div>

            <MobileCategoryBrowser
              key={categoriesSessionKey}
              categoryTree={categoryTree}
              activeCategorySlug={activeCategorySlug}
              onNavigate={handleClose}
            />
          </>
        )}
      </div>
    </>
  );
}
