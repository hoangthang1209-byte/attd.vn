"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ITEM_PRODUCTION_SAMPLE_STATUS_LABELS } from "@/features/item-production-tracking/labels";

type Props = { orderId: string };

type Summary = {
  order: {
    orderNo: string;
    customerNameSnapshot: string | null;
    customerCompanyName: string | null;
    customer: { name: string } | null;
  } | null;
  total: number;
  totalOrderedQuantity: number;
  sampleApprovedCount: number;
  inProductionCount: number;
  qcCount: number;
  readyToShipCount: number;
  atRiskCount: number;
  delayedCount: number;
  openIssueCount: number;
};

export default function ItemProductionOrderHeader({ orderId }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/orders/${orderId}/item-production-summary`);
      const json = await res.json();
      if (!cancelled && res.ok) setSummary(json.summary);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!summary?.order) return null;

  const customer =
    summary.order.customer?.name ||
    summary.order.customerCompanyName ||
    summary.order.customerNameSnapshot ||
    "—";

  return (
    <section className="admin-section-card" style={{ marginBottom: 14 }}>
      <div className="admin-section-header">
        <div>
          <h2 className="admin-subtitle" style={{ margin: 0 }}>
            {summary.order.orderNo}
          </h2>
          <p className="admin-field-hint" style={{ margin: "4px 0 0" }}>
            {customer} · {summary.total} item · {summary.totalOrderedQuantity.toLocaleString("vi-VN")} pcs
          </p>
        </div>
        <Link href={`/admin/orders/${orderId}`} className="admin-btn admin-btn--secondary admin-btn--small">
          Mở đơn hàng
        </Link>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 8,
          marginTop: 10,
        }}
      >
        {[
          {
            label: "Mẫu đã duyệt",
            value: `${summary.sampleApprovedCount}/${summary.total}`,
          },
          { label: "Đang SX", value: summary.inProductionCount },
          { label: "QC", value: summary.qcCount },
          { label: "Sẵn sàng giao", value: summary.readyToShipCount },
          { label: "Nguy cơ", value: summary.atRiskCount },
          { label: "Đã trễ", value: summary.delayedCount },
          { label: "Vấn đề mở", value: summary.openIssueCount },
        ].map((card) => (
          <div key={card.label} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
            <div className="admin-field-hint">{card.label}</div>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>
      <p className="admin-field-hint" style={{ margin: "10px 0 0" }}>
        Mẫu:{" "}
        {Object.entries(ITEM_PRODUCTION_SAMPLE_STATUS_LABELS)
          .map(([k, v]) => v)
          .join(" · ")}
      </p>
    </section>
  );
}
