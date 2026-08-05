"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import type { OperationsFilters, FiltersMeta } from "@/features/content/operations/content-operations.types";
import { SEO_TOPIC_PRIORITY_LABELS, SEO_TOPIC_STATUS_LABELS } from "@/features/content/seo/seo-labels";
import type { SeoTopicPriority, SeoTopicStatus } from "@prisma/client";

export const OPERATIONS_SAVED_FILTERS_KEY = "attd.ops.savedFilters";

type SavedFilter = { id: string; name: string; filters: OperationsFilters };

function readSavedFilters(): SavedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OPERATIONS_SAVED_FILTERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedFilter[]) : [];
  } catch {
    return [];
  }
}

function writeSavedFilters(filters: SavedFilter[]): void {
  try {
    window.localStorage.setItem(OPERATIONS_SAVED_FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // Best-effort only — saved filters are a convenience, not governed state.
  }
}

const QUICK_TOGGLES: Array<{ key: keyof OperationsFilters; label: string }> = [
  { key: "overdue", label: "Quá hạn" },
  { key: "blocked", label: "Tạm dừng/Từ chối" },
  { key: "needsRefresh", label: "Cần làm mới" },
  { key: "missingCta", label: "Thiếu CTA" },
  { key: "missingMeta", label: "Thiếu Meta" },
  { key: "missingMedia", label: "Thiếu hình" },
  { key: "missingFaq", label: "Thiếu FAQ" },
];

type OperationsFilterBarProps = {
  filters: OperationsFilters;
  onChange: (filters: OperationsFilters) => void;
  filtersMeta: FiltersMeta;
};

/** Facet filters + quick toggles + localStorage-persisted saved filter presets. */
export default function OperationsFilterBar({ filters, onChange, filtersMeta }: OperationsFilterBarProps) {
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [newFilterName, setNewFilterName] = useState("");

  useEffect(() => {
    setSaved(readSavedFilters());
  }, []);

  const patch = (next: Partial<OperationsFilters>) => onChange({ ...filters, ...next });

  const toggleFlag = (key: keyof OperationsFilters) => {
    patch({ [key]: filters[key] ? undefined : true } as Partial<OperationsFilters>);
  };

  const saveCurrentFilter = () => {
    const name = newFilterName.trim();
    if (!name) return;
    const next = [...saved, { id: `f-${Date.now()}`, name, filters }];
    setSaved(next);
    writeSavedFilters(next);
    setNewFilterName("");
  };

  const removeSavedFilter = (id: string) => {
    const next = saved.filter((f) => f.id !== id);
    setSaved(next);
    writeSavedFilters(next);
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className={styles.filterGrid}>
        <select
          className="admin-input"
          value={filters.status ?? ""}
          onChange={(e) => patch({ status: (e.target.value || undefined) as SeoTopicStatus | undefined })}
          aria-label="Lọc theo trạng thái"
        >
          <option value="">Trạng thái</option>
          {(Object.keys(SEO_TOPIC_STATUS_LABELS) as SeoTopicStatus[]).map((s) => (
            <option key={s} value={s}>
              {SEO_TOPIC_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={filters.campaignId ?? ""}
          onChange={(e) => patch({ campaignId: e.target.value || undefined, clusterId: undefined })}
          aria-label="Lọc theo campaign"
        >
          <option value="">Campaign</option>
          {filtersMeta.campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={filters.clusterId ?? ""}
          onChange={(e) => patch({ clusterId: e.target.value || undefined })}
          aria-label="Lọc theo cluster"
        >
          <option value="">Cluster</option>
          {filtersMeta.clusters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={filters.owner ?? ""}
          onChange={(e) => patch({ owner: e.target.value || undefined })}
          aria-label="Lọc theo người phụ trách"
        >
          <option value="">Người phụ trách</option>
          {filtersMeta.owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={filters.priority ?? ""}
          onChange={(e) => patch({ priority: (e.target.value || undefined) as SeoTopicPriority | undefined })}
          aria-label="Lọc theo độ ưu tiên"
        >
          <option value="">Ưu tiên</option>
          {(Object.keys(SEO_TOPIC_PRIORITY_LABELS) as SeoTopicPriority[]).map((p) => (
            <option key={p} value={p}>
              {SEO_TOPIC_PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
        <input
          type="month"
          className="admin-input"
          value={filters.publishMonth ?? ""}
          onChange={(e) => patch({ publishMonth: e.target.value || undefined })}
          aria-label="Lọc theo tháng xuất bản"
        />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {QUICK_TOGGLES.map((toggle) => (
          <button
            key={toggle.key}
            type="button"
            className={filters[toggle.key] ? "admin-btn admin-btn--primary admin-btn--small" : "admin-btn admin-btn--secondary admin-btn--small"}
            onClick={() => toggleFlag(toggle.key)}
            aria-pressed={Boolean(filters[toggle.key])}
          >
            {toggle.label}
          </button>
        ))}
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => onChange({})}>
          Xóa lọc
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          className="admin-input"
          style={{ maxWidth: 200 }}
          placeholder="Tên bộ lọc đã lưu"
          value={newFilterName}
          onChange={(e) => setNewFilterName(e.target.value)}
        />
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={saveCurrentFilter}>
          Lưu bộ lọc hiện tại
        </button>
        {saved.map((f) => (
          <span key={f.id} className={styles.savedFilterChip}>
            <button
              type="button"
              onClick={() => onChange(f.filters)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
            >
              {f.name}
            </button>
            <button
              type="button"
              onClick={() => removeSavedFilter(f.id)}
              aria-label={`Xóa bộ lọc ${f.name}`}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#94a3b8" }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
