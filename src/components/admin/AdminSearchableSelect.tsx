"use client";

import { useMemo, useState } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  sublabel?: string;
};

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
};

export default function AdminSearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "— Chọn —",
  searchPlaceholder = "Tìm kiếm…",
  disabled = false,
  emptyMessage,
  className,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        opt.sublabel?.toLowerCase().includes(term) ||
        opt.value.toLowerCase().includes(term),
    );
  }, [options, search]);

  const selected = options.find((opt) => opt.value === value);

  return (
    <div className={`admin-searchable-select${className ? ` ${className}` : ""}`}>
      <input
        className="admin-input admin-searchable-select__search"
        type="search"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={disabled}
        aria-controls={id ? `${id}-listbox` : undefined}
      />
      <select
        id={id}
        className="admin-input admin-searchable-select__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        size={Math.min(6, Math.max(3, filtered.length + 1))}
        aria-label={placeholder}
      >
        <option value="">{placeholder}</option>
        {filtered.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.sublabel ? `${opt.label} (${opt.sublabel})` : opt.label}
          </option>
        ))}
      </select>
      {selected && (
        <p className="admin-field-hint admin-searchable-select__selected">
          Đã chọn: {selected.label}
          {selected.sublabel ? ` · ${selected.sublabel}` : ""}
        </p>
      )}
      {emptyMessage && options.length === 0 && (
        <p className="admin-empty-state admin-searchable-select__empty">{emptyMessage}</p>
      )}
      {!emptyMessage && filtered.length === 0 && search.trim() && (
        <p className="admin-field-hint">Không tìm thấy kết quả.</p>
      )}
    </div>
  );
}
