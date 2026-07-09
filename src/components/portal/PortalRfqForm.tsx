"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DEALER_RFQ_PROJECT_TYPES,
  DEALER_RFQ_PROJECT_TYPE_LABELS,
  type DealerRFQItemInput,
} from "@/features/dealer/dealer-rfq.types";
import { ButtonLoading } from "@/components/ui/loading/ContextLoading";

const EMPTY_ITEM = (): DealerRFQItemInput => ({
  productName: "",
  skuSnapshot: "",
  quantity: 100,
  decorationType: "",
  position: "",
  note: "",
});

export default function PortalRfqForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState<string>("OTHER");
  const [productSummary, setProductSummary] = useState("");
  const [quantity, setQuantity] = useState("");
  const [targetBudget, setTargetBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [artworkUrls, setArtworkUrls] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<DealerRFQItemInput[]>([EMPTY_ITEM()]);

  function updateItem(index: number, patch: Partial<DealerRFQItemInput>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function save(submit: boolean) {
    setError(null);
    setLoading(true);
    try {
      const payload = {
        title,
        projectType,
        productSummary: productSummary.trim() || undefined,
        quantity: quantity ? Number(quantity) : undefined,
        targetBudget: targetBudget || undefined,
        deadline: deadline || undefined,
        deliveryLocation: deliveryLocation || undefined,
        artworkUrls: artworkUrls
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        contactName: contactName || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        note: note || undefined,
        items: items.filter((item) => item.productName.trim()),
        submit,
      };

      const res = await fetch("/api/portal/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { rfq?: { id: string }; message?: string };
      if (!res.ok) {
        setError(data.message ?? "Không thể lưu RFQ.");
        return;
      }
      router.push(`/portal/rfq/${data.rfq?.id ?? ""}`);
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="portal-page">
      <p className="portal-eyebrow">RFQ mới</p>
      <h1 className="portal-title">Gửi yêu cầu báo giá</h1>
      <p className="portal-lead">
        Mô tả sản phẩm tự do — không bắt buộc chọn SKU. Thêm dòng hàng nếu cần chi tiết từng mặt
        hàng.
      </p>

      <div className="portal-card portal-form" style={{ marginTop: 16 }}>
        <label className="portal-field">
          <span>Tiêu đề dự án *</span>
          <input className="portal-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label className="portal-field">
          <span>Loại dự án *</span>
          <select className="portal-input" value={projectType} onChange={(e) => setProjectType(e.target.value)}>
            {DEALER_RFQ_PROJECT_TYPES.map((type) => (
              <option key={type} value={type}>
                {DEALER_RFQ_PROJECT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="portal-field">
          <span>Mô tả sản phẩm / yêu cầu</span>
          <textarea
            className="portal-input"
            rows={4}
            value={productSummary}
            onChange={(e) => setProductSummary(e.target.value)}
            placeholder="VD: Áo thun cotton 220gsm, in lụa 2 mặt, 5 màu..."
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label className="portal-field">
            <span>Số lượng tổng</span>
            <input
              type="number"
              className="portal-input"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <label className="portal-field">
            <span>Ngân sách mục tiêu (VND)</span>
            <input
              type="number"
              className="portal-input"
              value={targetBudget}
              onChange={(e) => setTargetBudget(e.target.value)}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label className="portal-field">
            <span>Deadline</span>
            <input
              type="date"
              className="portal-input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>
          <label className="portal-field">
            <span>Địa điểm giao hàng</span>
            <input
              className="portal-input"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
            />
          </label>
        </div>

        <label className="portal-field">
          <span>Link artwork (mỗi dòng một URL)</span>
          <textarea
            className="portal-input"
            rows={3}
            value={artworkUrls}
            onChange={(e) => setArtworkUrls(e.target.value)}
            placeholder="https://..."
          />
        </label>

        <fieldset style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 16 }}>
          <legend style={{ fontWeight: 600, fontSize: 14 }}>Liên hệ (tùy chọn)</legend>
          <div style={{ display: "grid", gap: 12 }}>
            <input className="portal-input" placeholder="Họ tên" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            <input className="portal-input" placeholder="Email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            <input className="portal-input" placeholder="SĐT" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
        </fieldset>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Dòng hàng (tùy chọn)</span>
            <button type="button" className="portal-btn portal-btn--ghost" onClick={() => setItems((p) => [...p, EMPTY_ITEM()])}>
              + Thêm dòng
            </button>
          </div>
          {items.map((item, index) => (
            <div key={index} className="portal-card portal-card--muted" style={{ marginBottom: 8, padding: 12 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <input
                  className="portal-input"
                  placeholder="Tên sản phẩm *"
                  value={item.productName}
                  onChange={(e) => updateItem(index, { productName: e.target.value })}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: 8 }}>
                  <input
                    className="portal-input"
                    placeholder="SKU (nếu có)"
                    value={item.skuSnapshot ?? ""}
                    onChange={(e) => updateItem(index, { skuSnapshot: e.target.value })}
                  />
                  <input
                    className="portal-input"
                    placeholder="Loại in/thêu"
                    value={item.decorationType ?? ""}
                    onChange={(e) => updateItem(index, { decorationType: e.target.value })}
                  />
                  <input
                    type="number"
                    className="portal-input"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <label className="portal-field">
          <span>Ghi chú thêm</span>
          <textarea className="portal-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        {error && <p className="portal-error">{error}</p>}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="portal-btn" disabled={loading} aria-busy={loading || undefined} onClick={() => void save(false)}>
            {loading ? <ButtonLoading title="Đang lưu nháp…" tone="dealer" /> : "Lưu nháp"}
          </button>
          <button type="button" className="portal-btn portal-btn--primary" disabled={loading} aria-busy={loading || undefined} onClick={() => void save(true)}>
            {loading ? <ButtonLoading title="Đang gửi RFQ…" tone="dealer" /> : "Gửi RFQ"}
          </button>
          <Link href="/portal/rfq" className="portal-btn">
            Hủy
          </Link>
        </div>
      </div>
    </div>
  );
}
