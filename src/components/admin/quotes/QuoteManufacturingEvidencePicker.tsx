"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { QuoteManufacturingEvidenceItem } from "@/features/quotes/types";

type Props = {
  quoteId: string;
};

type ApiPayload = {
  selected?: QuoteManufacturingEvidenceItem[];
  suggestions?: QuoteManufacturingEvidenceItem[];
  available?: QuoteManufacturingEvidenceItem[];
  message?: string;
};

const MAX_SELECTED = 4;

const VISIBILITY_LABEL: Record<string, string> = {
  PUBLIC: "Public",
  DEALER_ONLY: "Đại lý",
};

function sortSelected(items: QuoteManufacturingEvidenceItem[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

function normalizeSelected(items: QuoteManufacturingEvidenceItem[]) {
  return sortSelected(items).map((item, index) => ({ ...item, sortOrder: index * 10 }));
}

export default function QuoteManufacturingEvidencePicker({ quoteId }: Props) {
  const [selected, setSelected] = useState<QuoteManufacturingEvidenceItem[]>([]);
  const [suggestions, setSuggestions] = useState<QuoteManufacturingEvidenceItem[]>([]);
  const [available, setAvailable] = useState<QuoteManufacturingEvidenceItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState("");
  const [quotePdfOnly, setQuotePdfOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/quotes/${quoteId}/manufacturing-evidence`);
    const data = (await res.json().catch(() => ({}))) as ApiPayload;
    if (!res.ok) {
      setMessage({ type: "error", text: data.message ?? "Không thể tải minh chứng." });
    } else {
      setSelected(normalizeSelected(data.selected ?? []));
      setSuggestions(data.suggestions ?? []);
      setAvailable(data.available ?? []);
    }
    setLoading(false);
  }, [quoteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    available.forEach((item) => {
      if (item.categorySlug && item.categoryName) map.set(item.categorySlug, item.categoryName);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "vi"));
  }, [available]);

  const selectedIds = useMemo(() => new Set(selected.map((item) => item.id)), [selected]);

  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return available.filter((item) => {
      if (selectedIds.has(item.id)) return false;
      if (category && item.categorySlug !== category) return false;
      if (visibility && item.visibility !== visibility) return false;
      if (quotePdfOnly && !item.displayLocationKeys.includes("quote-pdf")) return false;
      if (!q) return true;
      return [item.title, item.description, item.categoryName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [available, category, quotePdfOnly, search, selectedIds, visibility]);

  function addAsset(asset: QuoteManufacturingEvidenceItem) {
    setMessage(null);
    setSelected((items) => {
      if (items.some((item) => item.id === asset.id)) return items;
      if (items.length >= MAX_SELECTED) {
        setMessage({ type: "error", text: `Chọn tối đa ${MAX_SELECTED} minh chứng cho PDF.` });
        return items;
      }
      return normalizeSelected([...items, asset]);
    });
  }

  function removeAsset(assetId: string) {
    setSelected((items) => normalizeSelected(items.filter((item) => item.id !== assetId)));
  }

  function moveAsset(assetId: string, direction: -1 | 1) {
    setSelected((items) => {
      const sorted = sortSelected(items);
      const index = sorted.findIndex((item) => item.id === assetId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= sorted.length) return items;
      const next = [...sorted];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return normalizeSelected(next);
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/quotes/${quoteId}/manufacturing-evidence`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selected: selected.map((item, index) => ({
          assetId: item.id,
          sortOrder: index * 10,
        })),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as ApiPayload;
    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "error", text: data.message ?? "Không thể lưu minh chứng." });
      return;
    }
    setSelected(normalizeSelected(data.selected ?? []));
    setMessage({ type: "success", text: "Đã lưu minh chứng sản xuất cho PDF." });
  }

  const quickSuggestions = suggestions.filter((item) => !selectedIds.has(item.id)).slice(0, 4);

  return (
    <section className="quote-manufacturing-picker quote-form__card">
      <div className="admin-panel-header">
        <div>
          <h3 className="quote-form__card-title">Minh chứng sản xuất</h3>
          <p className="admin-field-hint">
            Chọn 2-4 tài sản Manufacturing Library để đưa vào PDF báo giá.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--primary admin-btn--small"
          onClick={() => void save()}
          disabled={saving || loading}
        >
          {saving ? "Đang lưu..." : "Lưu minh chứng"}
        </button>
      </div>

      {message ? (
        <p className={`admin-message admin-message--${message.type}`} role="status">
          {message.text}
        </p>
      ) : null}

      {loading ? (
        <p className="admin-loading">Đang tải minh chứng...</p>
      ) : (
        <>
          <div className="quote-manufacturing-picker__selected">
            {selected.length === 0 ? (
              <div className="admin-empty-state admin-empty-state--compact">
                <p>Chưa chọn minh chứng. PDF sẽ dùng fallback quote-pdf nếu có.</p>
              </div>
            ) : (
              selected.map((item, index) => (
                <article key={item.id} className="quote-manufacturing-picker__row">
                  <div className="quote-manufacturing-picker__thumb">
                    <Image src={item.imageUrl} alt={item.alt} fill sizes="72px" />
                  </div>
                  <div>
                    <p className="quote-manufacturing-picker__title">{item.title}</p>
                    <p className="admin-field-hint">
                      {item.categoryName ?? "Chưa phân loại"} ·{" "}
                      {VISIBILITY_LABEL[item.visibility] ?? item.visibility}
                    </p>
                  </div>
                  <div className="quote-manufacturing-picker__actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={() => moveAsset(item.id, -1)}
                      disabled={index === 0}
                    >
                      Lên
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={() => moveAsset(item.id, 1)}
                      disabled={index === selected.length - 1}
                    >
                      Xuống
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={() => removeAsset(item.id)}
                    >
                      Xóa
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          {quickSuggestions.length > 0 ? (
            <div className="quote-manufacturing-picker__suggestions">
              <p className="quote-manufacturing-picker__label">Gợi ý phù hợp</p>
              <div className="quote-manufacturing-picker__chips">
                {quickSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    onClick={() => addAsset(item)}
                  >
                    + {item.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="quote-manufacturing-picker__filters">
            <input
              className="admin-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tiêu đề, mô tả, danh mục"
            />
            <select
              className="admin-input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map(([slug, name]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="admin-input"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
            >
              <option value="">Public + đại lý</option>
              <option value="PUBLIC">Public</option>
              <option value="DEALER_ONLY">Đại lý</option>
            </select>
            <label className="admin-checkbox-row">
              <input
                type="checkbox"
                checked={quotePdfOnly}
                onChange={(event) => setQuotePdfOnly(event.target.checked)}
              />
              Chỉ quote-pdf
            </label>
          </div>

          <div className="quote-manufacturing-picker__grid">
            {filteredAvailable.slice(0, 24).map((item) => (
              <article key={item.id} className="quote-manufacturing-picker__card">
                <div className="quote-manufacturing-picker__card-media">
                  <Image src={item.imageUrl} alt={item.alt} fill sizes="160px" />
                </div>
                <div className="quote-manufacturing-picker__card-body">
                  <p className="quote-manufacturing-picker__title">{item.title}</p>
                  <p className="admin-field-hint">
                    {item.categoryName ?? "Chưa phân loại"} ·{" "}
                    {VISIBILITY_LABEL[item.visibility] ?? item.visibility}
                  </p>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    onClick={() => addAsset(item)}
                  >
                    Thêm
                  </button>
                </div>
              </article>
            ))}
            {filteredAvailable.length === 0 ? (
              <div className="admin-empty-state admin-empty-state--compact">
                <p>Không có minh chứng phù hợp bộ lọc.</p>
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
