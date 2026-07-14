"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import type {
  MediaAssetType,
  MediaCollectionType,
  MediaOrientation,
  MediaSeoReadinessStatus,
} from "@prisma/client";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";

export type MediaAssetSuggestion = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  altText: string | null;
  library: { code: string; name: string } | null;
  role: { code: string; name: string } | null;
  collections?: Array<{ code: string | null; name: string }>;
  orientation: MediaOrientation;
  visibility: string;
  score: number;
  matchedOn: string[];
  subjectTerms?: string[];
  seoScore?: number;
  seoReadinessStatus?: MediaSeoReadinessStatus;
  createdAt?: string;
};

type SortMode = "relevance" | "seo" | "newest";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "relevance", label: "Liên quan nhất" },
  { value: "seo", label: "SEO tốt nhất" },
  { value: "newest", label: "Mới nhất" },
];

export type MediaSuggestionPanelProps = {
  query: string;
  libraries?: string[];
  roles?: string[];
  collections?: string[];
  collectionTypes?: MediaCollectionType[];
  keywords?: string[];
  orientation?: MediaOrientation;
  assetTypes?: MediaAssetType[];
  subjects?: string[];
  materials?: string[];
  colors?: string[];
  techniques?: string[];
  industries?: string[];
  audiences?: string[];
  useCases?: string[];
  minimumSeoScore?: number;
  seoReadinessStatuses?: MediaSeoReadinessStatus[];
  selectedIds?: string[];
  multiple?: boolean;
  onSelect: (asset: MediaAssetSuggestion) => void;
  onOpenLibrary?: () => void;
  /** Show a client-side sort control (relevance / SEO / newest). Default sort stays relevance. */
  showSortControl?: boolean;
};

export default function MediaSuggestionPanel({
  query,
  libraries,
  roles,
  collections,
  collectionTypes,
  keywords,
  orientation,
  assetTypes,
  subjects,
  materials,
  colors,
  techniques,
  industries,
  audiences,
  useCases,
  minimumSeoScore,
  seoReadinessStatuses,
  selectedIds = [],
  multiple = false,
  onSelect,
  onOpenLibrary,
  showSortControl = true,
}: MediaSuggestionPanelProps) {
  const [items, setItems] = useState<MediaAssetSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>("relevance");

  const runDiscover = useEffectEvent(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/media/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          libraries,
          roles,
          collections,
          collectionTypes,
          keywords,
          orientation,
          assetTypes,
          subjects,
          materials,
          colors,
          techniques,
          industries,
          audiences,
          useCases,
          minimumSeoScore,
          seoReadinessStatuses,
          excludeIds: selectedIds,
          limit: 12,
        }),
      });
      const data = (await res.json()) as {
        items?: MediaAssetSuggestion[];
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải gợi ý ảnh");
      setItems(data.items ?? []);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Không thể tải gợi ý ảnh");
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void runDiscover(query);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [
    query,
    libraries,
    roles,
    collections,
    collectionTypes,
    keywords,
    orientation,
    assetTypes,
    subjects,
    materials,
    colors,
    techniques,
    industries,
    audiences,
    useCases,
    minimumSeoScore,
    seoReadinessStatuses,
    selectedIds,
    runDiscover,
  ]);

  const sortedItems = useMemo(() => {
    if (sortMode === "relevance") return items;
    const copy = [...items];
    if (sortMode === "seo") {
      copy.sort((a, b) => (b.seoScore ?? 0) - (a.seoScore ?? 0));
    } else if (sortMode === "newest") {
      copy.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }
    return copy;
  }, [items, sortMode]);

  function handleSelect(asset: MediaAssetSuggestion) {
    if (selectedIds.includes(asset.id) || picked.has(asset.id)) return;
    onSelect(asset);
    if (multiple) {
      setPicked((prev) => new Set(prev).add(asset.id));
    }
  }

  return (
    <div className="admin-media-suggestion-panel">
      <div className="admin-section-header">
        <h4 className="admin-subtitle" style={{ margin: 0 }}>
          Gợi ý ảnh SEO
        </h4>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {showSortControl && (
            <select
              className="admin-input admin-input--sm"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label="Sắp xếp gợi ý"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {onOpenLibrary && (
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={onOpenLibrary}>
              Mở thư viện ảnh
            </button>
          )}
        </div>
      </div>

      {loading && <InlineLoading title="Đang tìm ảnh phù hợp…" tone="admin" />}
      {error && <p className="admin-message admin-message--error">{error}</p>}

      {!loading && !error && sortedItems.length === 0 && (
        <p className="admin-field-hint">Không có gợi ý phù hợp.</p>
      )}

      <div className="admin-media-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
        {sortedItems.map((item) => {
          const disabled = selectedIds.includes(item.id) || picked.has(item.id);
          const subject = item.subjectTerms?.[0];
          return (
            <button
              key={item.id}
              type="button"
              className={`admin-media-card admin-media-card--selectable ${disabled ? "is-selected" : ""}`}
              disabled={disabled}
              onClick={() => handleSelect(item)}
            >
              <div className="admin-media-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.thumbnailUrl ?? item.url} alt={item.altText ?? item.title ?? ""} />
              </div>
              <div className="admin-media-meta">
                <p className="admin-field-hint" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {item.library && <span className="admin-badge">{item.library.name}</span>}
                  {item.role && <span className="admin-badge">{item.role.name}</span>}
                  {subject && <span className="admin-badge">{subject}</span>}
                  {(item.collections ?? []).slice(0, 2).map((col) => (
                    <span key={col.code ?? col.name} className="admin-badge">
                      {col.name}
                    </span>
                  ))}
                  {(item.collections?.length ?? 0) > 2 && (
                    <span className="admin-badge">+{(item.collections!.length - 2)}</span>
                  )}
                  {typeof item.seoScore === "number" && (
                    <span className="admin-badge">SEO {item.seoScore}</span>
                  )}
                </p>
                <p className="admin-field-hint">điểm {item.score}</p>
                <p className="admin-field-hint" title={item.matchedOn.join(", ")}>
                  {item.matchedOn.slice(0, 2).join(" · ")}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
