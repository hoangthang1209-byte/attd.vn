"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MarketplaceCategoryTreeNode } from "@/features/categories/marketplace-category-tree";

type Props = {
  categoryTree: MarketplaceCategoryTreeNode[];
  activeCategorySlug?: string | null;
  onNavigate: () => void;
};

export default function MobileCategoryBrowser({
  categoryTree,
  activeCategorySlug,
  onNavigate,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const visibleParents = useMemo(
    () => categoryTree.filter((p) => p.productCount > 0 || p.children.some((c) => c.productCount > 0)),
    [categoryTree],
  );

  function isParentExpanded(parent: MarketplaceCategoryTreeNode) {
    if (expandedIds.has(parent.id)) return true;
    if (!activeCategorySlug) return false;
    return (
      parent.slug === activeCategorySlug ||
      parent.children.some((c) => c.slug === activeCategorySlug)
    );
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (visibleParents.length === 0) return null;

  return (
    <section className="mobile-nav-categories" aria-label="Tất cả danh mục">
      <h2 className="mobile-nav-categories-heading">Tất cả danh mục</h2>
      <div className="mobile-nav-categories-scroll">
        <ul className="mobile-nav-categories-list">
          {visibleParents.map((parent) => {
            const hasChildren = parent.children.some((c) => c.productCount > 0);
            const isExpanded = isParentExpanded(parent);

            if (!hasChildren) {
              return (
                <li key={parent.id}>
                  <Link
                    href={parent.viewAllHref}
                    className="mobile-nav-categories-link"
                    onClick={onNavigate}
                  >
                    {parent.name}
                  </Link>
                </li>
              );
            }

            return (
              <li key={parent.id} className="mobile-nav-categories-item">
                <div className="mobile-nav-categories-parent-row">
                  <button
                    type="button"
                    className="mobile-nav-categories-expand"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? `Thu gọn ${parent.name}` : `Mở rộng ${parent.name}`}
                    onClick={() => toggleExpand(parent.id)}
                  >
                    <ChevronDown
                      size={18}
                      className={`mobile-nav-categories-chevron${isExpanded ? " mobile-nav-categories-chevron--open" : ""}`}
                      aria-hidden
                    />
                  </button>
                  <span className="mobile-nav-categories-parent-name">{parent.name}</span>
                </div>

                {isExpanded && (
                  <div className="mobile-nav-categories-children">
                    <Link
                      href={parent.viewAllHref}
                      className="mobile-nav-categories-view-all"
                      onClick={onNavigate}
                    >
                      Xem tất cả {parent.name}
                    </Link>
                    <ul className="mobile-nav-categories-child-list">
                      {parent.children
                        .filter((c) => c.productCount > 0)
                        .map((child) => (
                          <li key={child.id}>
                            <Link
                              href={child.href}
                              className={`mobile-nav-categories-child-link${activeCategorySlug === child.slug ? " mobile-nav-categories-child-link--active" : ""}`}
                              onClick={onNavigate}
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
