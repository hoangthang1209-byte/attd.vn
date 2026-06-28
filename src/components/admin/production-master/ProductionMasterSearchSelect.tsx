"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MasterSearchItem = {
  id: string;
  code: string;
  name: string;
  supplier?: { name: string } | null;
  composition?: string | null;
  gsm?: string | null;
  width?: string | null;
  defaultColor?: string | null;
};

type Props = {
  apiPath: string;
  value: string | null;
  displayLabel?: string | null;
  placeholder?: string;
  disabled?: boolean;
  activeOnly?: boolean;
  categoryFilter?: string | null;
  onSelect: (item: MasterSearchItem | null) => void;
};

export default function ProductionMasterSearchSelect({
  apiPath,
  value,
  displayLabel,
  placeholder = "Tìm trong thư viện...",
  disabled,
  activeOnly = true,
  categoryFilter,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MasterSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("search", q.trim());
        else if (categoryFilter) params.set("category", categoryFilter);
        if (activeOnly) params.set("activeOnly", "true");
        const res = await fetch(`${apiPath}?${params.toString()}`);
        const data = (await res.json()) as { items?: MasterSearchItem[] };
        setItems(data.items ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [apiPath, activeOnly, categoryFilter],
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void search(query), 200);
    return () => window.clearTimeout(timer);
  }, [open, query, search]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectedText = value ? displayLabel || value : "";

  return (
    <div className="production-master-search" ref={wrapRef}>
      <div className="production-master-search__control">
        <input
          className="admin-input admin-input--sm"
          placeholder={selectedText || placeholder}
          value={open ? query : selectedText}
          disabled={disabled}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setQuery("");
            void search("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
        {value && !disabled && (
          <button
            type="button"
            className="admin-btn admin-btn--xs production-master-search__clear"
            onClick={() => onSelect(null)}
            title="Bỏ liên kết"
          >
            ×
          </button>
        )}
      </div>
      {open && !disabled && (
        <div className="production-master-search__dropdown">
          {loading && <p className="admin-muted">Đang tìm...</p>}
          {!loading && items.length === 0 && <p className="admin-muted">Không có kết quả</p>}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="production-master-search__option"
              onClick={() => {
                onSelect(item);
                setOpen(false);
                setQuery("");
              }}
            >
              <strong>{item.code}</strong> — {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
