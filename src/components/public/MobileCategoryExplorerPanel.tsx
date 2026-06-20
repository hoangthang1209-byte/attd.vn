"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ChevronLeft, X } from "lucide-react";
import MobileCategoryBrowser from "@/components/public/MobileCategoryBrowser";
import type { MarketplaceCategoryTreeNode } from "@/features/categories/marketplace-category-tree";

type Props = {
  open: boolean;
  onClose: () => void;
  categoryTree: MarketplaceCategoryTreeNode[];
  activeCategorySlug?: string | null;
  restoreFocusRef?: RefObject<HTMLButtonElement | null>;
};

export default function MobileCategoryExplorerPanel({
  open,
  onClose,
  categoryTree,
  activeCategorySlug,
  restoreFocusRef,
}: Props) {
  const [sessionKey, setSessionKey] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  const handleClose = useCallback(() => {
    onClose();
    requestAnimationFrame(() => {
      restoreFocusRef?.current?.focus();
    });
  }, [onClose, restoreFocusRef]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setSessionKey((k) => k + 1);
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, handleClose]);

  if (categoryTree.length === 0) return null;

  return (
    <>
      <div
        className={`mobile-nav-backdrop${open ? " mobile-nav-backdrop--open" : ""}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className={`mobile-cat-explorer-panel${open ? " mobile-cat-explorer-panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Danh mục nguồn hàng"
        aria-hidden={!open}
      >
        <div className="mobile-cat-explorer-header">
          <button
            type="button"
            className="mobile-cat-explorer-header__back"
            onClick={handleClose}
            aria-label="Quay lại trang chủ"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <h2 className="mobile-cat-explorer-header__title">Danh mục nguồn hàng</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="mobile-nav-close mobile-cat-explorer-header__close"
            onClick={handleClose}
            aria-label="Đóng danh mục"
          >
            <X size={22} />
          </button>
        </div>

        <MobileCategoryBrowser
          key={sessionKey}
          categoryTree={categoryTree}
          activeCategorySlug={activeCategorySlug}
          onNavigate={handleClose}
        />
      </div>
    </>
  );
}
