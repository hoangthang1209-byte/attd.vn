"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCrmDateTime } from "@/features/crm/format";
import type { LeadIntakeHealthResponse, LeadIntakeHealthRow } from "@/features/crm/services/lead-intake-health.service";
import { AdminLoadingState } from "@/components/admin/AdminUi";

function connectionLabel(state: LeadIntakeHealthRow["connectionState"]): string {
  switch (state) {
    case "active":
      return "Hoạt động";
    case "configured":
      return "Đã cấu hình secret";
    case "inactive":
      return "Chưa cấu hình secret";
    default:
      return "Không rõ";
  }
}

export default function LeadIntakeHealthPanel() {
  const [data, setData] = useState<LeadIntakeHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/crm/lead-intake/health")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message ?? "Không tải được intake health");
        }
        setData(json as LeadIntakeHealthResponse);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <AdminLoadingState label="Đang tải Lead Intake Hub..." />;
  }

  if (error) {
    return <p className="admin-field-hint admin-field-hint--error">{error}</p>;
  }

  if (!data) return null;

  return (
    <div className="admin-panel">
      <p className="admin-field-hint" style={{ marginTop: 0 }}>
        Cập nhật: {formatCrmDateTime(data.generatedAt)} ·{" "}
        <Link href="/admin/crm/leads/import">Import CSV lead</Link>
      </p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nguồn / adapter</th>
              <th>Kết nối</th>
              <th>Intake gần nhất</th>
              <th>7 ngày (mới / trùng / lỗi)</th>
              <th>Lỗi gần nhất</th>
              <th>Leads</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.adapterKey}>
                <td>
                  <strong>{row.label}</strong>
                  <div className="admin-field-hint">{row.adapterKey}</div>
                </td>
                <td>{connectionLabel(row.connectionState)}</td>
                <td>
                  {row.lastSuccessfulIntakeAt
                    ? formatCrmDateTime(row.lastSuccessfulIntakeAt)
                    : "—"}
                </td>
                <td>
                  {row.recentCreated} / {row.recentDuplicate} / {row.recentError}
                </td>
                <td>{row.lastErrorSummary ?? "—"}</td>
                <td>
                  <Link href={`/admin/crm/leads?source=`}>Danh sách</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
