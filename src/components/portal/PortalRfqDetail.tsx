"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  DEALER_RFQ_ARTWORK_STATUS_LABELS,
  DEALER_RFQ_PROJECT_TYPE_LABELS,
  DEALER_RFQ_STATUS_LABELS,
  type DealerRFQRecord,
} from "@/features/dealer/dealer-rfq.types";

type PortalRfqDetailProps = {
  rfqId: string;
};

export default function PortalRfqDetail({ rfqId }: PortalRfqDetailProps) {
  const router = useRouter();
  const [rfq, setRfq] = useState<DealerRFQRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/rfqs/${rfqId}`);
      const data = (await res.json()) as { rfq?: DealerRFQRecord; message?: string };
      if (!res.ok) {
        setError(data.message ?? "Không tìm thấy RFQ.");
        setRfq(null);
        return;
      }
      setRfq(data.rfq ?? null);
    } catch {
      setError("Không thể tải RFQ.");
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitRfq() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/rfqs/${rfqId}/submit`, { method: "POST" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Không thể gửi RFQ.");
        return;
      }
      await load();
      router.refresh();
    } catch {
      setError("Không thể gửi RFQ.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p style={{ color: "#737373" }}>Đang tải…</p>;
  if (error || !rfq) {
    return (
      <div className="portal-page">
        <p className="portal-error">{error ?? "Không tìm thấy RFQ."}</p>
        <Link href="/portal/rfq" className="portal-btn">Quay lại</Link>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <p className="portal-eyebrow">{rfq.code}</p>
      <h1 className="portal-title">{rfq.title}</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <span className="portal-badge portal-badge--level">
          {DEALER_RFQ_STATUS_LABELS[rfq.status]}
        </span>
        <span className="portal-badge portal-badge--level">
          {DEALER_RFQ_PROJECT_TYPE_LABELS[rfq.projectType]}
        </span>
      </div>

      <div className="portal-grid portal-grid--2">
        <div className="portal-card">
          <h3>Tổng quan</h3>
          <dl className="portal-profile-dl" style={{ marginTop: 12 }}>
            <dt>Số lượng</dt>
            <dd>{rfq.quantity ?? "—"}</dd>
            <dt>Deadline</dt>
            <dd>{rfq.deadline ? new Date(rfq.deadline).toLocaleDateString("vi-VN") : "—"}</dd>
            <dt>Ngân sách</dt>
            <dd>{rfq.targetBudget ? `${Number(rfq.targetBudget).toLocaleString("vi-VN")} VND` : "—"}</dd>
            <dt>Giao hàng</dt>
            <dd>{rfq.deliveryLocation ?? "—"}</dd>
            <dt>Artwork</dt>
            <dd>{DEALER_RFQ_ARTWORK_STATUS_LABELS[rfq.artworkStatus]}</dd>
          </dl>
        </div>
        <div className="portal-card">
          <h3>Liên hệ</h3>
          <dl className="portal-profile-dl" style={{ marginTop: 12 }}>
            <dt>Họ tên</dt>
            <dd>{rfq.contactName ?? "—"}</dd>
            <dt>Email</dt>
            <dd>{rfq.contactEmail ?? "—"}</dd>
            <dt>SĐT</dt>
            <dd>{rfq.contactPhone ?? "—"}</dd>
          </dl>
        </div>
      </div>

      {rfq.productSummary && (
        <div className="portal-card" style={{ marginTop: 16 }}>
          <h3>Mô tả sản phẩm</h3>
          <p style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 14 }}>{rfq.productSummary}</p>
        </div>
      )}

      {rfq.items.length > 0 && (
        <div className="portal-card" style={{ marginTop: 16, overflowX: "auto" }}>
          <h3>Dòng hàng</h3>
          <table className="portal-table-preview" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>SKU</th>
                <th>SL</th>
                <th>In/thêu</th>
              </tr>
            </thead>
            <tbody>
              {rfq.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.productName}</td>
                  <td>{item.skuSnapshot ?? "—"}</td>
                  <td>{item.quantity}</td>
                  <td>{item.decorationType ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rfq.artworkUrls && rfq.artworkUrls.length > 0 && (
        <div className="portal-card" style={{ marginTop: 16 }}>
          <h3>Artwork</h3>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 14 }}>
            {rfq.artworkUrls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rfq.note && (
        <div className="portal-card portal-card--muted" style={{ marginTop: 16 }}>
          <h3>Ghi chú</h3>
          <p style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 14 }}>{rfq.note}</p>
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {rfq.status === "DRAFT" && (
          <button
            type="button"
            className="portal-btn portal-btn--primary"
            disabled={submitting}
            onClick={() => void submitRfq()}
          >
            Gửi RFQ
          </button>
        )}
        <Link href="/portal/rfq" className="portal-btn">
          Quay lại danh sách
        </Link>
      </div>
    </div>
  );
}
