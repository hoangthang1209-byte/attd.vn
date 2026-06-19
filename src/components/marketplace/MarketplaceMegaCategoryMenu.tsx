"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { MarketplaceCategoryTreeNode } from "@/features/categories/marketplace-category-tree";
import MarketplaceCategoryNav from "@/components/marketplace/MarketplaceCategoryNav";
import { isValidImageSrc } from "@/lib/imagePaths";

type MarketplaceMegaCategoryMenuProps = {
  categories: MarketplaceCategoryTreeNode[];
};

function resolveInitialParentId(categories: MarketplaceCategoryTreeNode[]): string {
  return categories[0]?.id ?? "";
}

export default function MarketplaceMegaCategoryMenu({
  categories,
}: MarketplaceMegaCategoryMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState(() =>
    resolveInitialParentId(categories),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLElement>(null);

  const activeParent =
    categories.find((group) => group.id === activeParentId) ?? categories[0];

  const close = useCallback(() => setOpen(false), []);

  const selectParent = useCallback((parentId: string) => {
    setActiveParentId(parentId);
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;
    setActiveParentId((current) =>
      categories.some((group) => group.id === current)
        ? current
        : categories[0].id,
    );
  }, [categories]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) {
      document.body.classList.add("mp-mega-cat-open");
    } else {
      document.body.classList.remove("mp-mega-cat-open");
    }
    return () => document.body.classList.remove("mp-mega-cat-open");
  }, [open]);

  useEffect(() => {
    if (rightPanelRef.current) {
      rightPanelRef.current.scrollTop = 0;
    }
  }, [activeParentId]);

  if (categories.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`mp-mega-cat-menu${open ? " mp-mega-cat-menu--open" : ""}`}
    >
      <div className="mp-header-cats-inner">
        <button
          type="button"
          className="mp-mega-cat-trigger"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((v) => !v)}
        >
          Tất cả danh mục
          <ChevronDown
            size={14}
            className={`mp-mega-cat-trigger-icon${open ? " mp-mega-cat-trigger-icon--open" : ""}`}
          />
        </button>
        <MarketplaceCategoryNav />
      </div>

      {open && activeParent && (
        <>
          <div
            className="mp-mega-cat-backdrop"
            aria-hidden="true"
            onClick={close}
          />
          <div className="mp-mega-cat-panel" role="dialog" aria-label="Danh mục nguồn hàng">
            <aside className="mp-mega-cat-left">
              <p className="mp-mega-cat-left-title">Danh mục nguồn hàng</p>
              <ul className="mp-mega-cat-parent-list">
                {categories.map((parent) => {
                  const isActive = parent.id === activeParentId;
                  return (
                    <li key={parent.id}>
                      <button
                        type="button"
                        className={`mp-mega-cat-parent-item${isActive ? " mp-mega-cat-parent-item--active" : ""}`}
                        aria-current={isActive ? "true" : undefined}
                        data-active={isActive ? "true" : undefined}
                        onMouseEnter={() => selectParent(parent.id)}
                        onFocus={() => selectParent(parent.id)}
                        onClick={(e) => {
                          e.preventDefault();
                          selectParent(parent.id);
                        }}
                      >
                        <span className="mp-mega-cat-parent-label">
                          {parent.name}
                        </span>
                        {parent.productCount > 0 && (
                          <span className="mp-mega-cat-parent-count">
                            {parent.productCount}
                          </span>
                        )}
                        <ChevronRight
                          size={16}
                          className="mp-mega-cat-parent-arrow"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <section ref={rightPanelRef} className="mp-mega-cat-right">
              <div className="mp-mega-cat-right-header">
                <h3 className="mp-mega-cat-right-title">{activeParent.name}</h3>
                <Link
                  href={activeParent.viewAllHref}
                  className="mp-mega-cat-view-all"
                  onClick={close}
                >
                  Xem tất cả
                </Link>
              </div>

              <div className="mp-mega-cat-grid" key={activeParent.id}>
                {activeParent.children.map((child) => (
                  <Link
                    key={`${activeParent.id}-${child.id || child.slug}`}
                    href={child.href}
                    className="mp-mega-cat-chip"
                    onClick={close}
                  >
                    <span className="mp-mega-cat-chip-img">
                      {child.imageUrl && isValidImageSrc(child.imageUrl) ? (
                        <Image
                          src={child.imageUrl}
                          alt=""
                          fill
                          className="mp-mega-cat-chip-photo"
                          sizes="96px"
                        />
                      ) : (
                        <span className="mp-mega-cat-chip-fallback" aria-hidden="true" />
                      )}
                    </span>
                    <span className="mp-mega-cat-chip-label">{child.name}</span>
                    {child.productCount > 0 && (
                      <span className="mp-mega-cat-chip-count">
                        {child.productCount} sp
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
