import type { LeadStatus } from "@prisma/client";
import { CRM_STATUS_LABELS } from "@/features/crm/labels";

const STATUS_STYLES: Record<
  LeadStatus,
  { bg: string; color: string; border: string }
> = {
  NEW: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
  CONTACTED: { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
  QUOTING: { bg: "#ffedd5", color: "#c2410c", border: "#fdba74" },
  NEGOTIATING: { bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" },
  WON: { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
  LOST: { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
};

export default function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const style = STATUS_STYLES[status];

  return (
    <span
      className="admin-lead-status-badge"
      style={{
        background: style.bg,
        color: style.color,
        borderColor: style.border,
      }}
    >
      {CRM_STATUS_LABELS[status]}
    </span>
  );
}
