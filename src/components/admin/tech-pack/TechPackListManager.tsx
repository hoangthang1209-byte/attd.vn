"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AdminLoadingState,
  AdminPageShell,
  EmptyState,
  PageHeader,
} from "@/components/admin/AdminUi";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { TechPackStatusBadge } from "@/components/admin/tech-pack/TechPackEntityStatusBadge";
import TechPackSourceItemSelector from "@/components/admin/tech-pack/TechPackSourceItemSelector";
import type { TechPackSourceItem } from "@/features/tech-pack/tech-pack.types";
import type { TechPackStatus } from "@prisma/client";
import { formatCrmDateTime } from "@/features/crm/format";

import type { TechPackListQuickFilter } from "@/features/tech-pack/tech-pack-completeness";

type TechPackRow = {
  id: string;
  code: string;
  version: number;
  status: TechPackStatus;
  title: string | null;
  customerNameSnapshot: string | null;
  orderCodeSnapshot: string | null;
  orderItemCodeSnapshot: string | null;
  jobCodeSnapshot: string | null;
  productNameSnapshot: string | null;
  deadline: string | null;
  updatedAt: string;
  ownerName?: string | null;
  pattern?: { code: string; name: string } | null;
  patternCodeSnapshot: string | null;
  completeness?: {
    hasTechnicalImage: boolean;
    hasArtwork: boolean;
    hasPattern: boolean;
    hasBomReference: boolean;
  };
};

const QUICK_FILTERS: Array<{ key: TechPackListQuickFilter; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "draft", label: "Nháp" },
  { key: "released", label: "Đã phát hành" },
  { key: "missing_pattern", label: "Thiếu rập" },
  { key: "missing_artwork", label: "Thiếu hình kỹ thuật" },
  { key: "mine", label: "Việc của tôi" },
];

export default function TechPackListManager() {
  const [items, setItems] = useState<TechPackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [quickFilter, setQuickFilter] = useState<TechPackListQuickFilter>("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [sourceMode, setSourceMode] = useState<"order-item" | "quote-item">("order-item");
  const [selectedSource, setSelectedSource] = useState<TechPackSourceItem | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [manualOrderItemId, setManualOrderItemId] = useState("");
  const [manualQuoteItemId, setManualQuoteItemId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (quickFilter !== "all") params.set("quickFilter", quickFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/tech-packs?${params.toString()}`);
      const data = (await res.json()) as { items?: TechPackRow[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải danh sách Tech Pack");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [statusFilter, quickFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const orderItemId =
      advancedOpen && manualOrderItemId.trim()
        ? manualOrderItemId.trim()
        : sourceMode === "order-item"
          ? selectedSource?.id ?? null
          : null;
    const quoteItemId =
      advancedOpen && manualQuoteItemId.trim()
        ? manualQuoteItemId.trim()
        : sourceMode === "quote-item"
          ? selectedSource?.id ?? null
          : null;

    const res = await fetch("/api/tech-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderItemId, quoteItemId }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    setSubmitting(false);
    if (!res.ok) {
      setError(data.message ?? "Không thể tạo Tech Pack");
      return;
    }
    setCreating(false);
    if (data.id) window.location.href = `/admin/tech-pack/${data.id}`;
    else void load();
  }

  return (
    <AdminPageShell>
      <PageHeader
        title="Tech Pack"
        actions={
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setCreating(true)}>
            Tạo Tech Pack
          </button>
        }
      />

      <div className="admin-data-toolbar" style={{ gap: 12, display: "flex", flexWrap: "wrap", marginBottom: 16 }}>
        <input
          className="admin-input"
          placeholder="Tìm mã Tech Pack, đơn hàng, sản phẩm, rập…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void load()}
        />
        <div className="prod-plan-chips" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`admin-btn admin-btn--small${quickFilter === f.key ? " admin-btn--primary" : ""}`}
              onClick={() => setQuickFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select className="admin-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="RELEASED">Đã phát hành</option>
          <option value="SUPERSEDED">Bị thay thế</option>
        </select>
        <button type="button" className="admin-btn" onClick={() => void load()}>
          Lọc
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading ? (
        <AdminLoadingState label="Đang tải Tech Pack..." />
      ) : items.length === 0 ? (
        <EmptyState title="Chưa có Tech Pack" description="Tạo Tech Pack từ hạng mục đơn hàng hoặc báo giá." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã Tech Pack</th>
                <th>Sản phẩm</th>
                <th>Đơn hàng</th>
                <th>Rập</th>
                <th>Phiên bản</th>
                <th>Trạng thái</th>
                <th>Phụ trách</th>
                <th>Đủ điều kiện</th>
                <th>Cập nhật</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{row.code}</td>
                  <td>{row.productNameSnapshot ?? row.title ?? "—"}</td>
                  <td>
                    {row.orderCodeSnapshot ?? "—"}
                    {(row.jobCodeSnapshot ?? row.orderItemCodeSnapshot) && (
                      <span className="admin-field-hint">
                        {" "}
                        · {row.jobCodeSnapshot ?? row.orderItemCodeSnapshot}
                      </span>
                    )}
                  </td>
                  <td>{row.pattern?.code ?? row.patternCodeSnapshot ?? "—"}</td>
                  <td>v{row.version}</td>
                  <td>
                    <TechPackStatusBadge status={row.status} />
                  </td>
                  <td>{row.ownerName ?? "—"}</td>
                  <td>
                    <div className="tech-pack-completeness-chips">
                      <span className={row.completeness?.hasTechnicalImage ? "is-ok" : "is-miss"} title="Hình kỹ thuật">HK</span>
                      <span className={row.completeness?.hasArtwork ? "is-ok" : "is-miss"} title="Artwork">AW</span>
                      <span className={row.completeness?.hasPattern ? "is-ok" : "is-miss"} title="Rập">Rập</span>
                      <span className={row.completeness?.hasBomReference ? "is-ok" : "is-miss"} title="BOM">BOM</span>
                    </div>
                  </td>
                  <td>{row.updatedAt ? formatCrmDateTime(row.updatedAt) : "—"}</td>
                  <td>
                    <Link href={`/admin/tech-pack/${row.id}`} className="admin-link">
                      Mở
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <div className="admin-modal-backdrop">
          <form className="admin-modal admin-modal--wide" onSubmit={(e) => void handleCreate(e)}>
            <h3>Tạo Tech Pack</h3>
            <div className="admin-tabs" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                className={`admin-btn admin-btn--small${sourceMode === "order-item" ? " admin-btn--primary" : ""}`}
                onClick={() => {
                  setSourceMode("order-item");
                  setSelectedSource(null);
                }}
              >
                Từ đơn hàng
              </button>
              <button
                type="button"
                className={`admin-btn admin-btn--small${sourceMode === "quote-item" ? " admin-btn--primary" : ""}`}
                onClick={() => {
                  setSourceMode("quote-item");
                  setSelectedSource(null);
                }}
              >
                Từ báo giá
              </button>
            </div>

            <TechPackSourceItemSelector
              sourceType={sourceMode}
              selectedId={selectedSource?.id ?? ""}
              onSelect={setSelectedSource}
            />

            <details
              className="tech-pack-advanced-create"
              open={advancedOpen}
              onToggle={(e) => setAdvancedOpen(e.currentTarget.open)}
            >
              <summary>Tạo nâng cao</summary>
              <label className="admin-field">
                <span>Order Item ID</span>
                <input
                  className="admin-input"
                  value={manualOrderItemId}
                  onChange={(e) => setManualOrderItemId(e.target.value)}
                />
              </label>
              <label className="admin-field">
                <span>Quote Item ID</span>
                <input
                  className="admin-input"
                  value={manualQuoteItemId}
                  onChange={(e) => setManualQuoteItemId(e.target.value)}
                />
              </label>
            </details>

            <div className="admin-modal__actions">
              <button type="button" className="admin-btn" onClick={() => setCreating(false)}>
                Hủy
              </button>
              <AdminLoadingButton
                type="submit"
                variant="primary"
                pending={submitting}
                pendingLabel="Đang tạo Tech Pack…"
                disabled={submitting || (!advancedOpen && !selectedSource)}
              >
                Tạo Tech Pack
              </AdminLoadingButton>
            </div>
          </form>
        </div>
      )}
    </AdminPageShell>
  );
}
