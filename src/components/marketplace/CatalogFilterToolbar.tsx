"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import type { CatalogCategoryFilterNode } from "@/features/categories/services/category.service";
import ProductFilterForm from "@/components/marketplace/ProductFilterForm";
import {
  buildCatalogUrl,
  buildClearFiltersUrl,
  countActiveCatalogFilters,
  hasActiveCatalogFilters,
  removeCatalogFilterParam,
  type CatalogFilters,
} from "@/lib/catalog-filter-url";

type ActiveChip = {
  key: "category" | "inStock" | "print" | "embroidery" | "oem" | "material";
  label: string;
};

type Props = {
  categoryTree: CatalogCategoryFilterNode[];
  filters: CatalogFilters;
  categoryLabel?: string | null;
};

function buildActiveChips(
  filters: CatalogFilters,
  categoryLabel?: string | null,
): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (filters.category) {
    chips.push({
      key: "category",
      label: categoryLabel ?? filters.category,
    });
  }
  if (filters.inStock) chips.push({ key: "inStock", label: "Còn hàng / sắp hết" });
  if (filters.print) chips.push({ key: "print", label: "Hỗ trợ in logo" });
  if (filters.embroidery) chips.push({ key: "embroidery", label: "Hỗ trợ thêu" });
  if (filters.oem) chips.push({ key: "oem", label: "Hỗ trợ OEM" });
  if (filters.material) chips.push({ key: "material", label: `Chất liệu: ${filters.material}` });
  return chips;
}

export default function CatalogFilterToolbar({
  categoryTree,
  filters,
  categoryLabel,
}: Props) {
  const router = useRouter();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [draft, setDraft] = useState<CatalogFilters>(filters);

  const activeCount = countActiveCatalogFilters(filters);
  const chips = buildActiveChips(filters, categoryLabel);
  const hasFilters = hasActiveCatalogFilters(filters);

  useEffect(() => {
    function syncViewport() {
      setIsMobile(window.matchMedia("(max-width: 767px)").matches);
    }
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const navigateInstant = useCallback(
    (href: string) => {
      router.push(href);
      close();
    },
    [router, close],
  );

  useEffect(() => {
    if (!open || isMobile) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      close();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isMobile, close]);

  useEffect(() => {
    if (!open || !isMobile) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isMobile, close]);

  function applyDraft() {
    router.push(buildCatalogUrl(draft));
    close();
  }

  function clearDraft() {
    setDraft({ q: filters.q });
  }

  function toggleFilterOpen() {
    setOpen((wasOpen) => {
      if (!wasOpen && isMobile) {
        setDraft(filters);
      }
      return !wasOpen;
    });
  }

  return (
    <div className="mp-catalog-toolbar">
      <div className="mp-catalog-toolbar-row">
        <button
          ref={triggerRef}
          type="button"
          className="mp-catalog-filter-trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggleFilterOpen}
        >
          <SlidersHorizontal size={16} aria-hidden />
          Bộ lọc{activeCount > 0 ? ` · ${activeCount}` : ""}
        </button>

        {hasFilters && (
          <button
            type="button"
            className="mp-catalog-filter-clear"
            onClick={() => router.push(buildClearFiltersUrl(filters.q))}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mp-catalog-chips" aria-label="Bộ lọc đang áp dụng">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="mp-catalog-chip"
              onClick={() => router.push(removeCatalogFilterParam(filters, chip.key))}
              aria-label={`Xóa bộ lọc ${chip.label}`}
            >
              <span>{chip.label}</span>
              <X size={14} aria-hidden />
            </button>
          ))}
        </div>
      )}

      {open && !isMobile && (
        <div
          ref={panelRef}
          id={panelId}
          className="mp-catalog-filter-panel"
          role="dialog"
          aria-label="Bộ lọc sản phẩm"
        >
          <ProductFilterForm
            categoryTree={categoryTree}
            filters={filters}
            mode="instant"
            onNavigate={navigateInstant}
            defaultExpandCategory
          />
        </div>
      )}

      {open && isMobile && (
        <>
          <div
            className="mp-catalog-filter-sheet-backdrop"
            aria-hidden
            onClick={close}
          />
          <div
            ref={sheetRef}
            className="mp-catalog-filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Bộ lọc sản phẩm"
          >
            <div className="mp-catalog-filter-sheet-header">
              <h2 className="mp-catalog-filter-sheet-title">Bộ lọc sản phẩm</h2>
              <button
                type="button"
                className="mp-catalog-filter-sheet-close"
                aria-label="Đóng bộ lọc"
                onClick={close}
              >
                <X size={20} aria-hidden />
              </button>
            </div>

            <div className="mp-catalog-filter-sheet-body">
              <ProductFilterForm
                categoryTree={categoryTree}
                filters={draft}
                mode="draft"
                onDraftChange={setDraft}
                defaultExpandCategory
              />
            </div>

            <div className="mp-catalog-filter-sheet-footer">
              <button
                type="button"
                className="mp-catalog-filter-sheet-clear"
                onClick={clearDraft}
              >
                Xóa bộ lọc
              </button>
              <button
                type="button"
                className="mp-catalog-filter-sheet-apply"
                onClick={applyDraft}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
