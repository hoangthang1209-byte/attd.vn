"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  CostingSourcePricePickerRow,
  CostingSourceSearchHit,
} from "@/features/pricing/costing-source-price";
import { initialPickerSourcePriceId } from "@/features/pricing/costing-source-price";
import { compactSourceIdentity } from "@/features/pricing/costing-v2-identity";
import { formatPricingCurrency } from "@/features/pricing/format";

export type CostingSourcePickerSelection = {
  source: CostingSourceSearchHit;
  price: CostingSourcePricePickerRow | null;
  manual: boolean;
};

type Props = {
  open: boolean;
  kind: "MATERIALS" | "COST_LIBRARY";
  title: string;
  onClose: () => void;
  onSelect: (selection: CostingSourcePickerSelection) => void;
  onManualWithoutSource?: () => void;
};

function sourceKindLabel(hit: CostingSourceSearchHit): string {
  if (hit.type === "PRODUCTION_TRIM") return "Phụ liệu";
  if (hit.type === "COST_LIBRARY") return "Gia công";
  return "Vật liệu";
}

export default function CostingSourcePickerDialog({
  open,
  kind,
  title,
  onClose,
  onSelect,
  onManualWithoutSource,
}: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [hits, setHits] = useState<CostingSourceSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<CostingSourceSearchHit | null>(null);
  const [prices, setPrices] = useState<CostingSourcePricePickerRow[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setHits([]);
      setSelectedSource(null);
      setPrices([]);
      setSelectedPriceId(null);
      setSearchError(null);
      setPriceError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || selectedSource) return;
    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    void fetch(
      `/api/pricing/costing-source-search?kind=${encodeURIComponent(kind)}&q=${encodeURIComponent(debouncedQuery)}`,
    )
      .then(async (res) => {
        const data = (await res.json()) as { items?: CostingSourceSearchHit[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không thể tìm nguồn giá.");
        if (!cancelled) setHits(data.items ?? []);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setHits([]);
          setSearchError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, kind, debouncedQuery, selectedSource]);

  useEffect(() => {
    if (!open || !selectedSource) return;
    let cancelled = false;
    setLoadingPrices(true);
    setPriceError(null);
    setSelectedPriceId(null);
    void fetch(
      `/api/pricing/costing-source-prices?sourceType=${encodeURIComponent(selectedSource.type)}&sourceId=${encodeURIComponent(selectedSource.id)}`,
    )
      .then(async (res) => {
        const data = (await res.json()) as { items?: CostingSourcePricePickerRow[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không thể tải giá nhà cung cấp.");
        const items = data.items ?? [];
        if (cancelled) return;
        setPrices(items);
        setSelectedPriceId(initialPickerSourcePriceId(items));
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setPrices([]);
          setPriceError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPrices(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedSource]);

  const emptyLibrary = !searching && hits.length === 0 && !searchError && !selectedSource;
  const selectedPrice = useMemo(
    () => prices.find((row) => row.id === selectedPriceId) ?? null,
    [prices, selectedPriceId],
  );

  if (!open) return null;

  return (
    <div className="costing-picker-backdrop" role="presentation" onClick={onClose}>
      <div
        className="costing-picker costing-picker--wide"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="costing-picker__header">
          <h3 className="costing-picker__title">{title}</h3>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={onClose}>
            Đóng
          </button>
        </div>

        {!selectedSource ? (
          <>
            <div className="admin-field">
              <label className="admin-label" htmlFor="costing-source-search">
                Tìm kiếm
              </label>
              <input
                id="costing-source-search"
                className="admin-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={kind === "MATERIALS" ? "cotton 250, rib, zipper, woven label" : "may, in lụa, thêu, ủi"}
                autoFocus
              />
            </div>
            {searching && <p className="admin-field-hint">Đang tìm…</p>}
            {searchError && <p className="admin-error">{searchError}</p>}
            {emptyLibrary && kind === "MATERIALS" && (
              <div className="costing-picker__empty">
                <p>Chưa có nguyên phụ liệu trong thư viện.</p>
                <Link href="/admin/production-materials" className="admin-btn admin-btn--secondary admin-btn--small">
                  KỸ THUẬT → Nguyên vật liệu
                </Link>
              </div>
            )}
            {emptyLibrary && kind === "COST_LIBRARY" && (
              <p className="admin-field-hint">Không tìm thấy gia công / dịch vụ phù hợp.</p>
            )}
            <div className="costing-picker__list">
              {hits.map((hit) => (
                <button
                  key={`${hit.type}-${hit.id}`}
                  type="button"
                  className="costing-picker__row costing-picker__row--button"
                  onClick={() => setSelectedSource(hit)}
                >
                  <span className="costing-picker__row-main">
                    <strong>{compactSourceIdentity(hit)}</strong>
                    <span className="admin-field-hint">{sourceKindLabel(hit)}</span>
                  </span>
                </button>
              ))}
            </div>
            {onManualWithoutSource && (
              <div className="costing-picker__footer">
                <button type="button" className="admin-btn admin-btn--secondary" onClick={onManualWithoutSource}>
                  Thêm dòng thủ công
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--xs"
              onClick={() => {
                setSelectedSource(null);
                setPrices([]);
                setSelectedPriceId(null);
              }}
            >
              ← Chọn nguồn khác
            </button>
            <p className="costing-picker__selected-source">{compactSourceIdentity(selectedSource)}</p>
            {loadingPrices && <p className="admin-field-hint">Đang tải giá nhà cung cấp…</p>}
            {priceError && <p className="admin-error">{priceError}</p>}
            {!loadingPrices && prices.length === 0 && (
              <div className="costing-picker__empty">
                <p>Chưa có giá nhà cung cấp cho hạng mục này.</p>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--small"
                  onClick={() =>
                    onSelect({
                      source: selectedSource,
                      price: null,
                      manual: true,
                    })
                  }
                >
                  Thêm dòng thủ công
                </button>
              </div>
            )}
            {prices.length > 0 && (
              <div className="costing-picker__list">
                {prices.map((price) => (
                  <label key={price.id} className="costing-picker__row costing-picker__row--choice">
                    <input
                      type="radio"
                      name="costing-source-price"
                      checked={selectedPriceId === price.id}
                      onChange={() => setSelectedPriceId(price.id)}
                    />
                    <span className="costing-picker__row-main">
                      <strong>{price.supplierName}</strong>
                      <span className="admin-field-hint">
                        {formatPricingCurrency(price.unitPrice)} / {price.unit}
                        {price.calculationType ? ` · ${price.calculationType}` : ""}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {prices.length > 0 && (
              <div className="costing-picker__footer">
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  disabled={!selectedPrice}
                  onClick={() => {
                    if (!selectedPrice) return;
                    onSelect({ source: selectedSource, price: selectedPrice, manual: false });
                  }}
                >
                  {prices.length === 1 ? "Dùng nhà cung cấp này" : "Chọn nhà cung cấp"}
                </button>
                {!selectedPrice && prices.length > 1 && (
                  <p className="admin-field-hint">Vui lòng chọn nhà cung cấp</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
