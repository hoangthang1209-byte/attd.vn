"use client";

import { useState } from "react";
import type { DealerLeadStatus } from "@prisma/client";

const STATUS_LABELS: Record<DealerLeadStatus, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  QUALIFIED: "Tiềm năng",
  CLOSED: "Đã đóng",
};

const STATUS_COLORS: Record<DealerLeadStatus, { bg: string; color: string }> = {
  NEW: { bg: "#dbeafe", color: "#1d4ed8" },
  CONTACTED: { bg: "#fef9c3", color: "#854d0e" },
  QUALIFIED: { bg: "#dcfce7", color: "#166534" },
  CLOSED: { bg: "#f3f4f6", color: "#6b7280" },
};

const ALL_STATUSES: DealerLeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED"];

interface DealerLeadStatusSelectorProps {
  leadId: string;
  initialStatus: DealerLeadStatus;
}

export default function DealerLeadStatusSelector({
  leadId,
  initialStatus,
}: DealerLeadStatusSelectorProps) {
  const [status, setStatus] = useState<DealerLeadStatus>(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function handleChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ): Promise<void> {
    const newStatus = e.target.value as DealerLeadStatus;
    setSaving(true);
    setError(false);

    try {
      const res = await fetch(`/api/dealer-leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setStatus(newStatus);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  const { bg, color } = STATUS_COLORS[status];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span
        style={{
          display: "inline-block",
          padding: "2px 10px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: 600,
          background: bg,
          color,
          whiteSpace: "nowrap",
        }}
      >
        {STATUS_LABELS[status]}
      </span>

      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        title="Đổi trạng thái"
        aria-label="Đổi trạng thái"
        style={{
          fontSize: "12px",
          padding: "3px 6px",
          border: `1px solid ${error ? "#fca5a5" : "#e5e7eb"}`,
          borderRadius: "6px",
          background: "#fff",
          cursor: "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      {error && (
        <span style={{ fontSize: "11px", color: "#dc2626" }} title="Lưu thất bại">
          ✕
        </span>
      )}
    </div>
  );
}
