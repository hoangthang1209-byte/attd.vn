"use client";

import { useEffect, useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type Template = { id: string; code: string; name: string };
type OrderItemRow = {
  id: string;
  productNameSnapshot: string | null;
  variantNameSnapshot: string | null;
  quantity: number;
  variants?: Array<{ quantity: number }>;
};

type Props = {
  orderId: string;
  onClose: () => void;
  onInitialized: () => void;
};

function itemQty(item: OrderItemRow) {
  if (item.variants?.length) {
    return item.variants.reduce((s, v) => s + v.quantity, 0);
  }
  return item.quantity;
}

/** Per-OrderItem workflow selection before initializing Lean Ops tracking. */
export default function ItemProductionInitModal({ orderId, onClose, onInitialized }: Props) {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [templateByItem, setTemplateByItem] = useState<Record<string, string>>({});
  const [defaultTemplateId, setDefaultTemplateId] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [tplRes, orderRes] = await Promise.all([
          fetch("/api/manufacturing/production-workflow-templates"),
          fetch(`/api/orders/${orderId}`),
        ]);
        const tplJson = await tplRes.json();
        const orderJson = await orderRes.json();
        if (!tplRes.ok) throw new Error(tplJson.message ?? "Không tải được workflow");
        if (!orderRes.ok) throw new Error(orderJson.message ?? "Không tải được đơn");
        if (cancelled) return;
        const tpls = (tplJson.templates ?? []) as Template[];
        setTemplates(tpls);
        const orderItems = (orderJson.order?.items ?? orderJson.items ?? []) as OrderItemRow[];
        setItems(orderItems);
        const preferred =
          tpls.find((t) => t.code === "TEE_PRINT_EMBROIDERY")?.id ?? tpls[0]?.id ?? "";
        setDefaultTemplateId(preferred);
        const map: Record<string, string> = {};
        for (const item of orderItems) map[item.id] = preferred;
        setTemplateByItem(map);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Lỗi tải");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/manufacturing/production-items/initialize-from-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          templateIdByOrderItemId: templateByItem,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Khởi tạo thất bại");
      onInitialized();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khởi tạo thất bại");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="prod-plan-drawer-overlay" role="presentation" onClick={onClose} style={{ zIndex: 55 }}>
      <div
        role="dialog"
        aria-label="Khởi tạo theo dõi sản xuất"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 10,
          padding: 20,
          width: "min(640px, calc(100vw - 32px))",
          margin: "8vh auto",
          boxShadow: "0 20px 40px rgba(0,0,0,.15)",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <h3 className="admin-subtitle" style={{ marginTop: 0 }}>
          Khởi tạo theo dõi sản xuất
        </h3>
        <p className="admin-field-hint">
          Chọn workflow cho từng item. Size/variant không tạo dòng sản xuất riêng.
        </p>
        {error ? <p className="admin-error">{error}</p> : null}
        {loading ? (
          <p className="admin-field-hint">Đang tải…</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <label className="admin-label">
              Mặc định cho tất cả
              <select
                className="admin-select"
                value={defaultTemplateId}
                onChange={(e) => {
                  const id = e.target.value;
                  setDefaultTemplateId(id);
                  const next: Record<string, string> = {};
                  for (const item of items) next[item.id] = id;
                  setTemplateByItem(next);
                }}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: "grid", gap: 8 }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 200px",
                    gap: 8,
                    alignItems: "center",
                    borderBottom: "1px solid #eee",
                    paddingBottom: 8,
                  }}
                >
                  <div>
                    <strong>
                      {[item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") ||
                        "Item"}
                    </strong>
                    <div className="admin-field-hint">{itemQty(item).toLocaleString("vi-VN")} pcs</div>
                  </div>
                  <select
                    className="admin-select"
                    value={templateByItem[item.id] ?? defaultTemplateId}
                    onChange={(e) =>
                      setTemplateByItem((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Hủy
          </button>
          <AdminLoadingButton pending={pending || loading} variant="primary" onClick={() => void save()}>
            Khởi tạo
          </AdminLoadingButton>
        </div>
      </div>
    </div>
  );
}
