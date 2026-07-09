"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PortalEmptyState from "@/components/portal/PortalEmptyState";
import {
  DEALER_RFQ_PROJECT_TYPE_LABELS,
  DEALER_RFQ_STATUS_LABELS,
  type DealerRFQRecord,
} from "@/features/dealer/dealer-rfq.types";
import { TableLoading } from "@/components/ui/loading/ContextLoading";

function statusClass(status: DealerRFQRecord["status"]): string {
  if (status === "DRAFT") return "portal-badge--pending";
  if (status === "QUOTED" || status === "WON") return "portal-badge--approved";
  if (status === "LOST" || status === "CANCELLED") return "portal-badge--blocked";
  return "portal-badge--level";
}

export default function PortalRfqList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rfqs, setRfqs] = useState<DealerRFQRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const status = searchParams.get("status");
      if (status) params.set("status", status);
      const res = await fetch(`/api/portal/rfqs?${params.toString()}`);
      const data = (await res.json()) as { rfqs?: DealerRFQRecord[]; message?: string };
      if (!res.ok) {
        setError(data.message ?? "Không thể tải RFQ.");
        setRfqs([]);
        return;
      }
      setRfqs(Array.isArray(data.rfqs) ? data.rfqs : []);
    } catch {
      setError("Không thể tải RFQ.");
      setRfqs([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="portal-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p className="portal-eyebrow">RFQ</p>
          <h1 className="portal-title">Yêu cầu báo giá B2B</h1>
          <p className="portal-lead">
            Gửi yêu cầu với mô tả tự do — không cần chọn SKU chính xác. Đội sales ATTD sẽ báo giá theo
            nhu cầu của bạn.
          </p>
        </div>
        <Link href="/portal/rfq/new" className="portal-btn portal-btn--primary">
          Gửi RFQ mới
        </Link>
      </div>

      {loading && (
        <TableLoading
          title="Đang tải danh sách RFQ…"
          description="Hệ thống đang đồng bộ yêu cầu báo giá của bạn."
          tone="dealer"
          rows={4}
        />
      )}
      {error && <p className="portal-error">{error}</p>}

      {!loading && !error && rfqs.length === 0 && (
        <PortalEmptyState
          title="Chưa có yêu cầu báo giá"
          description="Bạn có thể gửi RFQ với mô tả sản phẩm tự do, số lượng và deadline — không cần SKU."
        />
      )}

      {!loading && rfqs.length > 0 && (
        <div className="portal-card" style={{ overflowX: "auto", marginTop: 16 }}>
          <table className="portal-table-preview">
            <thead>
              <tr>
                <th>Mã RFQ</th>
                <th>Dự án</th>
                <th>Số lượng</th>
                <th>Deadline</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map((rfq) => (
                <tr
                  key={rfq.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/portal/rfq/${rfq.id}`)}
                >
                  <td>
                    <Link href={`/portal/rfq/${rfq.id}`} style={{ fontWeight: 600, color: "#171717" }}>
                      {rfq.code}
                    </Link>
                  </td>
                  <td>{DEALER_RFQ_PROJECT_TYPE_LABELS[rfq.projectType]}</td>
                  <td>{rfq.quantity ?? "—"}</td>
                  <td>
                    {rfq.deadline
                      ? new Date(rfq.deadline).toLocaleDateString("vi-VN")
                      : "—"}
                  </td>
                  <td>
                    <span className={`portal-badge ${statusClass(rfq.status)}`}>
                      {DEALER_RFQ_STATUS_LABELS[rfq.status]}
                    </span>
                  </td>
                  <td>{new Date(rfq.updatedAt).toLocaleDateString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
