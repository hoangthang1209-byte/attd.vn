"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { CatalogCategoryFilterNode } from "@/features/categories/services/category.service";
import {
  buildCatalogUrl,
  type CatalogFilters,
} from "@/lib/catalog-filter-url";

type ProductFilterFormProps = {
  categoryTree: CatalogCategoryFilterNode[];
  filters: CatalogFilters;
  /** instant = navigate on each selection; draft = local state only */
  mode: "instant" | "draft";
  onNavigate?: (href: string) => void;
  onDraftChange?: (filters: CatalogFilters) => void;
  /** Accordion: expand category group when a category is already selected */
  defaultExpandCategory?: boolean;
};

const STOCK_GROUP = [{ key: "inStock" as const, label: "Còn hàng / sắp hết" }];

const PROCESSING_GROUP = [
  { key: "print" as const, label: "Hỗ trợ in logo" },
  { key: "embroidery" as const, label: "Hỗ trợ thêu" },
  { key: "oem" as const, label: "Hỗ trợ OEM" },
];

function FilterAccordion({
  id,
  title,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mp-filter-accordion">
      <button
        type="button"
        id={`${id}-trigger`}
        className="mp-filter-accordion-trigger"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <ChevronDown
          size={18}
          className={`mp-filter-accordion-icon${open ? " mp-filter-accordion-icon--open" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div id={`${id}-panel`} className="mp-filter-accordion-panel" role="region" aria-labelledby={`${id}-trigger`}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function ProductFilterForm({
  categoryTree,
  filters,
  mode,
  onNavigate,
  onDraftChange,
  defaultExpandCategory = false,
}: ProductFilterFormProps) {
  const [draft, setDraft] = useState<CatalogFilters>(filters);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(() => new Set());

  const active = mode === "draft" ? draft : filters;

  const visibleTree = useMemo(
    () => categoryTree.filter((p) => p.productCount > 0),
    [categoryTree],
  );

  const applyChange = useCallback(
    (next: CatalogFilters) => {
      if (mode === "instant") {
        onNavigate?.(buildCatalogUrl(next));
      } else {
        setDraft(next);
        onDraftChange?.(next);
      }
    },
    [mode, onNavigate, onDraftChange],
  );

  function toggleBool(key: "inStock" | "print" | "embroidery" | "oem") {
    applyChange({ ...active, [key]: !active[key] });
  }

  function selectCategory(slug: string | undefined) {
    applyChange({ ...active, category: slug });
  }

  function toggleParentExpand(parentId: string) {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }

  function renderToggle(
    key: "inStock" | "print" | "embroidery" | "oem",
    label: string,
  ) {
    const isActive = Boolean(active[key]);
    if (mode === "instant") {
      const next = { ...active, [key]: !isActive };
      return (
        <Link
          href={buildCatalogUrl(next)}
          className={`mp-filter-check${isActive ? " mp-filter-check--active" : ""}`}
        >
          <span className="mp-filter-check-box" aria-hidden />
          {label}
        </Link>
      );
    }
    return (
      <button
        type="button"
        className={`mp-filter-check mp-filter-check--button${isActive ? " mp-filter-check--active" : ""}`}
        aria-pressed={isActive}
        onClick={() => toggleBool(key)}
      >
        <span className="mp-filter-check-box" aria-hidden />
        {label}
      </button>
    );
  }

  return (
    <div className="mp-filter-form">
      <FilterAccordion
        id="mp-filter-cat"
        title="Danh mục"
        defaultOpen={defaultExpandCategory && Boolean(active.category)}
      >
        <ul className="mp-filter-category-tree">
          <li>
            {mode === "instant" ? (
              <Link
                href={buildCatalogUrl({ ...active, category: undefined })}
                className={`mp-filter-parent${!active.category ? " mp-filter-parent--active" : ""}`}
              >
                Tất cả danh mục
              </Link>
            ) : (
              <button
                type="button"
                className={`mp-filter-parent mp-filter-parent--button${!active.category ? " mp-filter-parent--active" : ""}`}
                onClick={() => selectCategory(undefined)}
              >
                Tất cả danh mục
              </button>
            )}
          </li>

          {visibleTree.map((parent) => {
            const isParentActive = active.category === parent.slug;
            const isChildActive = parent.children.some(
              (c) => c.slug === active.category,
            );
            const isExpanded =
              expandedParents.has(parent.id) || isParentActive || isChildActive;
            const hasChildren = parent.children.some((c) => c.productCount > 0);

            return (
              <li key={parent.id} className="mp-filter-category-group">
                <div className="mp-filter-parent-row">
                  {mode === "instant" ? (
                    <Link
                      href={buildCatalogUrl({ ...active, category: parent.slug })}
                      className={`mp-filter-parent mp-filter-parent--flex${isParentActive ? " mp-filter-parent--active" : ""}`}
                    >
                      <span className="mp-filter-parent-label">{parent.name}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`mp-filter-parent mp-filter-parent--button mp-filter-parent--flex${isParentActive ? " mp-filter-parent--active" : ""}`}
                      onClick={() => selectCategory(parent.slug)}
                    >
                      <span className="mp-filter-parent-label">{parent.name}</span>
                    </button>
                  )}
                  {hasChildren && (
                    <button
                      type="button"
                      className="mp-filter-expand-btn"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? `Thu gọn ${parent.name}` : `Mở rộng ${parent.name}`}
                      onClick={() => toggleParentExpand(parent.id)}
                    >
                      <ChevronDown
                        size={16}
                        className={`mp-filter-accordion-icon${isExpanded ? " mp-filter-accordion-icon--open" : ""}`}
                        aria-hidden
                      />
                    </button>
                  )}
                </div>

                {hasChildren && isExpanded && (
                  <ul className="mp-filter-children mp-filter-children--expanded">
                    {parent.children
                      .filter((c) => c.productCount > 0)
                      .map((child) =>
                        mode === "instant" ? (
                          <li key={child.id}>
                            <Link
                              href={buildCatalogUrl({ ...active, category: child.slug })}
                              className={`mp-filter-child${active.category === child.slug ? " mp-filter-child--active" : ""}`}
                            >
                              <span className="mp-filter-child-label">{child.name}</span>
                            </Link>
                          </li>
                        ) : (
                          <li key={child.id}>
                            <button
                              type="button"
                              className={`mp-filter-child mp-filter-child--button${active.category === child.slug ? " mp-filter-child--active" : ""}`}
                              onClick={() => selectCategory(child.slug)}
                            >
                              <span className="mp-filter-child-label">{child.name}</span>
                            </button>
                          </li>
                        ),
                      )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </FilterAccordion>

      <FilterAccordion id="mp-filter-stock" title="Tình trạng hàng">
        <ul className="mp-filter-checks">
          {STOCK_GROUP.map((item) => (
            <li key={item.key}>{renderToggle(item.key, item.label)}</li>
          ))}
        </ul>
      </FilterAccordion>

      <FilterAccordion id="mp-filter-processing" title="Nhu cầu gia công">
        <ul className="mp-filter-checks">
          {PROCESSING_GROUP.map((item) => (
            <li key={item.key}>{renderToggle(item.key, item.label)}</li>
          ))}
        </ul>
      </FilterAccordion>
    </div>
  );
}
