"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import CategoryMenuImage from "@/components/marketplace/CategoryMenuImage";
import type { MarketplaceCategoryTreeNode } from "@/features/categories/marketplace-category-tree";

type Props = {
  categoryTree: MarketplaceCategoryTreeNode[];
  activeCategorySlug?: string | null;
  onNavigate: () => void;
};

function resolveInitialParentId(
  parents: MarketplaceCategoryTreeNode[],
  activeCategorySlug?: string | null,
): string {
  if (activeCategorySlug) {
    const match = parents.find(
      (p) =>
        p.slug === activeCategorySlug ||
        p.children.some((c) => c.slug === activeCategorySlug),
    );
    if (match) return match.id;
  }
  return parents[0]?.id ?? "";
}

export default function MobileCategoryBrowser({
  categoryTree,
  activeCategorySlug,
  onNavigate,
}: Props) {
  const [activeParentId, setActiveParentId] = useState(() =>
    resolveInitialParentId(categoryTree, activeCategorySlug),
  );
  const discoveryRef = useRef<HTMLElement>(null);

  const activeParent =
    categoryTree.find((p) => p.id === activeParentId) ?? categoryTree[0];

  if (!activeParent || categoryTree.length === 0) return null;

  const visibleChildren = activeParent.children;

  function selectParent(parentId: string) {
    setActiveParentId(parentId);
    if (discoveryRef.current) {
      discoveryRef.current.scrollTop = 0;
    }
  }

  return (
    <div className="mobile-cat-explorer" aria-label="Danh mục nguồn hàng">
      <div className="mobile-cat-explorer__panes">
        <aside className="mobile-cat-explorer__rail" aria-label="Danh mục cha">
          <ul className="mobile-cat-explorer__parent-list">
            {categoryTree.map((parent) => {
              const isActive = parent.id === activeParentId;
              return (
                <li key={parent.id}>
                  <button
                    type="button"
                    className={`mobile-cat-explorer__parent-btn${isActive ? " mobile-cat-explorer__parent-btn--active" : ""}`}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => selectParent(parent.id)}
                  >
                    <span className="mobile-cat-explorer__parent-label">{parent.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section
          ref={discoveryRef}
          className="mobile-cat-explorer__discovery"
          aria-label={`Danh mục con: ${activeParent.name}`}
        >
          <div className="mobile-cat-explorer__discovery-header">
            <h2 className="mobile-cat-explorer__discovery-title">{activeParent.name}</h2>
            <Link
              href={activeParent.viewAllHref}
              className="mobile-cat-explorer__view-all"
              onClick={onNavigate}
            >
              Xem tất cả
            </Link>
          </div>

          {visibleChildren.length > 0 ? (
            <div className="mobile-cat-explorer__grid">
              {visibleChildren.map((child) => (
                <Link
                  key={child.id}
                  href={child.href}
                  className="mobile-cat-explorer__card"
                  onClick={onNavigate}
                >
                  <CategoryMenuImage
                    imageUrl={child.imageUrl}
                    name={child.name}
                    size="explorer"
                  />
                  <span className="mobile-cat-explorer__card-label">{child.name}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mobile-cat-explorer__empty">
              <LayoutGrid
                size={28}
                className="mobile-cat-explorer__empty-icon"
                aria-hidden="true"
              />
              <p className="mobile-cat-explorer__empty-text">
                Khám phá các sản phẩm thuộc danh mục này.
              </p>
              <Link
                href={activeParent.viewAllHref}
                className="mobile-cat-explorer__empty-cta"
                onClick={onNavigate}
              >
                Xem tất cả sản phẩm
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
