"use client";

import { useEffect, useMemo, useState } from "react";
import type { PatternSourceType, PatternStatus } from "@prisma/client";
import { PatternStatusBadge } from "@/components/admin/tech-pack/TechPackEntityStatusBadge";
import { formatPatternSourceLabel } from "@/features/patterns/pattern-source-labels";
import PatternCategoryThumbnail from "@/components/admin/patterns/PatternCategoryThumbnail";
import { normalizePatternCategoryVisual } from "@/features/patterns/pattern-category-visual";

export type PatternPickerOption = {
  id: string;
  code: string;
  name: string;
  version: number;
  baseSize: string | null;
  status: PatternStatus;
  sourceType: PatternSourceType | null;
  customerNameSnapshot: string | null;
  productCategory?: {
    id: string;
    name: string;
    imageUrl?: string | null;
    products?: Array<{ featuredImage: string | null }>;
  } | null;
  customer?: { name: string; code: string } | null;
};

type Props = {
  value: string;
  onChange: (patternId: string) => void;
  disabled?: boolean;
};

export default function PatternPicker({ value, onChange, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [patterns, setPatterns] = useState<PatternPickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      params.set("limit", "40");
      void fetch(`/api/patterns?${params.toString()}`)
        .then((r) => r.json())
        .then((data: { items?: PatternPickerOption[] }) => {
          const items = data.items ?? [];
          items.sort((a, b) => {
            const rank = (s: PatternStatus) =>
              s === "APPROVED" ? 0 : s === "DRAFT" ? 1 : 2;
            const diff = rank(a.status) - rank(b.status);
            if (diff !== 0) return diff;
            return a.code.localeCompare(b.code);
          });
          setPatterns(items);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const selected = useMemo(
    () => patterns.find((p) => p.id === value) ?? null,
    [patterns, value],
  );

  const showWarning = selected && selected.status !== "APPROVED";

  return (
    <div className="pattern-picker">
      <div className="pattern-picker__search-row">
        <input
          className="admin-input"
          placeholder="Tìm mã rập, tên, nhóm sản phẩm, base size…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
        />
        {loading && <span className="admin-field-hint">Đang tìm…</span>}
      </div>

      {open && !disabled && patterns.length > 0 && (
        <ul className="pattern-picker__results">
          {patterns.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`pattern-picker__option${value === p.id ? " is-selected" : ""}`}
                onClick={() => {
                  onChange(p.id);
                  setOpen(false);
                }}
              >
                <PatternCategoryThumbnail
                  category={normalizePatternCategoryVisual(p.productCategory)}
                  size="picker"
                />
                <span className="pattern-picker__option-body">
                  <span className="pattern-picker__option-title">
                    <strong>{p.code}</strong> — {p.name}
                  </span>
                  <span className="pattern-picker__meta">
                    {formatPatternSourceLabel(p.sourceType) && (
                      <span>{formatPatternSourceLabel(p.sourceType)}</span>
                    )}
                    {(p.customer?.name ?? p.customerNameSnapshot) && (
                      <span>{p.customer?.name ?? p.customerNameSnapshot}</span>
                    )}
                    {p.productCategory?.name && <span>{p.productCategory.name}</span>}
                    <PatternStatusBadge status={p.status} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <p className="admin-field-hint">
          Đã chọn: {selected.code} — {selected.name} (v{selected.version})
        </p>
      )}

      {showWarning && (
        <p className="admin-message admin-message--warning">
          Rập này chưa được duyệt. Vui lòng kiểm tra kỹ trước khi áp dụng.
        </p>
      )}
    </div>
  );
}
