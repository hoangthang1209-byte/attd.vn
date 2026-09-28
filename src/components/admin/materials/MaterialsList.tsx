"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";
import { useSearchParams } from "next/navigation";
import type { MaterialType } from "@prisma/client";
import { MATERIAL_TYPE_LABELS, WAREHOUSE_STATUS_LABELS } from "@/features/materials/material-labels";
import { withFromListParams } from "@/lib/admin/list-return";

const PAGE_SIZE = 50;

type MaterialRow = {
  id: string;
  materialCode: string;
  name: string;
  materialType: MaterialType;
  unit: string;
  reorderPoint: string | null;
  isActive: boolean;
  warehouseBalance: {
    onHandQuantity: string;
    availableQuantity: string;
  } | null;
};

export default function MaterialsList() {
  const searchParams = useSearchParams();
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (activeOnly) params.set("active", "1");
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((page - 1) * PAGE_SIZE));

    try {
      const res = await fetch(`/api/materials?${params.toString()}`, { signal });
      const data = (await res.json()) as {
        materials?: MaterialRow[];
        total?: number;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải danh sách vật tư.");
      setMaterials(data.materials ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setMaterials([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : "Không thể tải danh sách vật tư.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [search, activeOnly, page]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void load(controller.signal);
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function warehouseLabel(m: MaterialRow): string {
    if (!m.warehouseBalance) return WAREHOUSE_STATUS_LABELS.undeclared;
    const available = Number(m.warehouseBalance.availableQuantity);
    const reorder = m.reorderPoint ? Number(m.reorderPoint) : null;
    if (available <= 0) return WAREHOUSE_STATUS_LABELS.shortage;
    if (reorder != null && available <= reorder) return WAREHOUSE_STATUS_LABELS.low;
    return WAREHOUSE_STATUS_LABELS.enough;
  }

  return (
    <div>
      <div className="admin-toolbar" style={{ marginBottom: 16 }}>
        <input
          className="admin-input"
          placeholder="Tìm mã, tên vật tư…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <label className="admin-checkbox-label">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => {
              setActiveOnly(e.target.checked);
              setPage(1);
            }}
          />
          Chỉ vật tư đang dùng
        </label>
        <Link href="/admin/materials/warehouse" className="admin-btn admin-btn--secondary">
          Tồn kho
        </Link>
        <Link href="/admin/material-suppliers" className="admin-btn admin-btn--secondary">
          Nhà cung cấp
        </Link>
        <Link href={withFromListParams("/admin/materials/new", searchParams)} className="admin-btn admin-btn--primary">
          Thêm vật tư
        </Link>
      </div>

      {!loading && (
        <div className="admin-field-hint" style={{ marginBottom: 10 }}>
          {total === 0
            ? "Chưa có vật tư phù hợp."
            : `Đang hiển thị ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} / ${total} vật tư.`}
        </div>
      )}

      {error ? <p className="admin-error">{error}</p> : null}

      {loading ? (
        <AdminInlineLoader message="Đang tải danh sách vật tư…" />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên</th>
                  <th>Loại</th>
                  <th>ĐVT</th>
                  <th>Tồn kho</th>
                  <th>Khả dụng</th>
                  <th>Mức tồn tối thiểu</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td>{m.materialCode}</td>
                    <td>{m.name}</td>
                    <td>{MATERIAL_TYPE_LABELS[m.materialType]}</td>
                    <td>{m.unit}</td>
                    <td>{m.warehouseBalance?.onHandQuantity ?? "—"}</td>
                    <td>{m.warehouseBalance?.availableQuantity ?? "—"}</td>
                    <td>{m.reorderPoint ?? "—"}</td>
                    <td>{warehouseLabel(m)}</td>
                    <td>
                      <Link
                        href={withFromListParams(`/admin/materials/${m.id}/edit`, searchParams)}
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                      >
                        Sửa
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 ? (
            <div className="admin-toolbar" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Trang trước
              </button>
              <span className="admin-field-hint">
                Trang {page} / {pageCount}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                disabled={page >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                Trang sau
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
