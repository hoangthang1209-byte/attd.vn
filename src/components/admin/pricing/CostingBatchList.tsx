"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import type { CostingBatchDetail } from "@/features/pricing/services/costing-batch.service";

type BatchListItem = {
  id: string;
  code: string;
  title: string | null;
  status: string;
  customerLabel: string | null;
  itemCount: number;
  quoteNo: string | null;
  createdAt: string;
};

export default function CostingBatchList() {
  const router = useRouter();
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  function reload() {
    setLoading(true);
    void fetch("/api/pricing/costing-batches")
      .then(async (res) => {
        const data = await res.json() as { batches?: BatchListItem[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không thể tải batch");
        setBatches(data.batches ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/pricing/costing-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined }),
      });
      const data = await res.json() as { batch?: CostingBatchDetail; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo batch");
      if (data.batch?.id) router.push(`/admin/pricing/costing/batch/${data.batch.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo batch");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <AdminLoadingState label="Đang tải batch costing…" />;

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <h3 className="admin-subtitle" style={{ margin: 0 }}>Costing batch</h3>
        <Link href="/admin/pricing/costing" className="admin-btn admin-btn--secondary">
          Costing đơn lẻ
        </Link>
      </div>

      <form onSubmit={(e) => void handleCreate(e)} style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <input
          className="admin-input"
          placeholder="Tên batch / tham chiếu (VD: BIG BANG)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ minWidth: 280 }}
        />
        <button type="submit" className="admin-btn admin-btn--primary" disabled={creating}>
          {creating ? "Đang tạo…" : "Tạo batch mới"}
        </button>
      </form>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên</th>
              <th>Khách hàng</th>
              <th>Dòng</th>
              <th>Trạng thái</th>
              <th>Báo giá</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td>
                  <Link href={`/admin/pricing/costing/batch/${batch.id}`}>{batch.code}</Link>
                </td>
                <td>{batch.title ?? "—"}</td>
                <td>{batch.customerLabel ?? "—"}</td>
                <td>{batch.itemCount}</td>
                <td>{batch.status}</td>
                <td>{batch.quoteNo ?? "—"}</td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr>
                <td colSpan={6} className="admin-field-hint">Chưa có batch costing.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
