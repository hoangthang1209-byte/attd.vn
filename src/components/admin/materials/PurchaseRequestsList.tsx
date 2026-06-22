"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PURCHASE_REQUEST_STATUS_LABELS } from "@/features/materials/material-labels";
import type { PurchaseRequestStatus } from "@prisma/client";
import { withFromListParams } from "@/lib/admin/list-return";

type RequestRow = {
  id: string;
  requestCode: string;
  status: PurchaseRequestStatus;
  supplierName: string | null;
  itemCount: number;
  totalRequestedQuantity: string;
  requestedByEmployee: { fullName: string } | null;
  requestedAt: string | null;
  expectedArrivalAt: string | null;
  updatedAt: string;
};

export default function PurchaseRequestsList() {
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/purchase-requests");
    const data = (await res.json()) as { requests?: RequestRow[] };
    setRequests(data.requests ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const newHref = withFromListParams("/admin/purchase-requests/new", searchParams);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link href={newHref} className="admin-btn admin-btn--primary">
          Tạo yêu cầu mua hàng
        </Link>
      </div>
      {loading ? (
        <p className="admin-field-hint">Đang tải…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Trạng thái</th>
                <th>NCC</th>
                <th>Dòng</th>
                <th>Tổng SL</th>
                <th>Người YC</th>
                <th>Ngày YC</th>
                <th>Dự kiến về</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.requestCode}</td>
                  <td>{PURCHASE_REQUEST_STATUS_LABELS[r.status]}</td>
                  <td>{r.supplierName ?? "—"}</td>
                  <td>{r.itemCount}</td>
                  <td>{r.totalRequestedQuantity}</td>
                  <td>{r.requestedByEmployee?.fullName ?? "—"}</td>
                  <td>{r.requestedAt ? r.requestedAt.slice(0, 10) : "—"}</td>
                  <td>{r.expectedArrivalAt ? r.expectedArrivalAt.slice(0, 10) : "—"}</td>
                  <td>
                    <Link
                      href={withFromListParams(`/admin/purchase-requests/${r.id}`, searchParams)}
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                    >
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
