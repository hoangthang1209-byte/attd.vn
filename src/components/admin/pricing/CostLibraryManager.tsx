"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  COST_LIBRARY_CATEGORY_LABELS,
  type CostLibraryCategory,
  type CostLibraryItem,
} from "@/features/pricing/cost-library";
import { formatPricingCurrency } from "@/features/pricing/format";
import { AdminLoadingState, EmptyState, PageHeader, SectionCard } from "@/components/admin/AdminUi";
import CostingSourcePricePanel from "@/components/admin/pricing/CostingSourcePricePanel";

export default function CostLibraryManager() {
  const [items, setItems] = useState<CostLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pricing/cost-library");
      const data = (await res.json()) as { items?: CostLibraryItem[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải thư viện chi phí");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải thư viện chi phí");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("vi-VN");
    return items.filter((item) => {
      if (!q) return true;
      return (
        item.name.toLocaleLowerCase("vi-VN").includes(q) ||
        COST_LIBRARY_CATEGORY_LABELS[item.category].toLocaleLowerCase("vi-VN").includes(q)
      );
    });
  }, [items, query]);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  if (loading) return <AdminLoadingState label="Đang tải thư viện chi phí…" />;
  if (error) {
    return (
      <EmptyState
        tone="error"
        title="Không tải được thư viện chi phí"
        description={error}
        action={
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
            Thử lại
          </button>
        }
      />
    );
  }

  return (
    <div className="admin-panel">
      <PageHeader
        title="Thư viện chi phí"
        description="Giá tham chiếu theo nhà cung cấp / xưởng cho từng mục cost library. Không ghi vào Phí dịch vụ (ServicePriceRule)."
        actions={
          <Link href="/admin/pricing" className="admin-btn">
            Quay lại cấu hình giá
          </Link>
        }
      />

      <div className="admin-form-grid" style={{ marginBottom: 16 }}>
        <label className="admin-field">
          <span>Tìm mục</span>
          <input
            className="admin-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="may, in lụa, thêu…"
          />
        </label>
      </div>

      <SectionCard title="Cost Library">
        {filtered.length === 0 ? (
          <p className="admin-muted">Không tìm thấy mục phù hợp.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Nhóm</th>
                  <th>Cost mặc định</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      {item.legacyBuiltinId ? (
                        <div className="admin-muted" style={{ fontSize: 12 }}>
                          Mẫu hệ thống
                        </div>
                      ) : null}
                    </td>
                    <td>{COST_LIBRARY_CATEGORY_LABELS[item.category as CostLibraryCategory]}</td>
                    <td>{formatPricingCurrency(item.defaultUnitCost)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn--xs admin-btn--secondary"
                        onClick={() => setSelectedId(item.id)}
                      >
                        Giá theo NCC
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {selected && (
        <CostingSourcePricePanel
          key={selected.id}
          title={`Giá theo nhà cung cấp / xưởng — ${selected.name}`}
          pricesApiPath={`/api/pricing/cost-library/${selected.id}/source-prices`}
          defaultUnit="cái"
          showCalculationType
          suggestedUnits={["cái", "vị trí", "đơn"]}
        />
      )}
    </div>
  );
}
