"use client";

import { useState } from "react";
import type { LeadPipelineStatus } from "@prisma/client";
import {
  PIPELINE_STATUS_LABELS,
  PIPELINE_STATUS_COLORS,
  ALL_PIPELINE_STATUSES,
} from "@/lib/pipelineStatus";

export { PIPELINE_STATUS_LABELS, PIPELINE_STATUS_COLORS };

const ALL_STATUSES = ALL_PIPELINE_STATUSES;

interface PipelineStatusSelectorProps {
  leadId: string;
  initialStatus: LeadPipelineStatus;
  onStatusChange?: (newStatus: LeadPipelineStatus) => void;
}

export default function PipelineStatusSelector({
  leadId,
  initialStatus,
  onStatusChange,
}: PipelineStatusSelectorProps) {
  const [status, setStatus] = useState<LeadPipelineStatus>(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function handleChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ): Promise<void> {
    const newStatus = e.target.value as LeadPipelineStatus;
    const prev = status;
    setStatus(newStatus); // Optimistic update
    setSaving(true);
    setError(false);

    try {
      const res = await fetch(`/api/dealer-leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        onStatusChange?.(newStatus);
      } else {
        setStatus(prev); // Revert on failure
        setError(true);
      }
    } catch {
      setStatus(prev);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  const { bg, color } = PIPELINE_STATUS_COLORS[status];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
        {PIPELINE_STATUS_LABELS[status]}
      </span>

      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        title="Đổi trạng thái"
        aria-label="Đổi trạng thái pipeline"
        style={{
          fontSize: "12px",
          padding: "3px 6px",
          border: `1px solid ${error ? "#fca5a5" : "#e5e7eb"}`,
          borderRadius: "6px",
          background: "#fff",
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {PIPELINE_STATUS_LABELS[s]}
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
