import type { LeadStatus } from "@prisma/client";
import { getLeadStatusLabel } from "@/features/crm/labels";

const STATUS_STYLES: Record<
  LeadStatus,
  { bg: string; color: string; border: string }
> = {
  NEW: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
  CONTACTED: { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
  QUALIFIED: { bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc" },
  NEED_PRICING: { bg: "#fef3c7", color: "#b45309", border: "#fcd34d" },
  QUOTED: { bg: "#ffedd5", color: "#c2410c", border: "#fdba74" },
  QUOTING: { bg: "#ffedd5", color: "#c2410c", border: "#fdba74" },
  NEGOTIATING: { bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" },
  WON: { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
  LOST: { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
  NOT_FIT: { bg: "#f5f5f4", color: "#78716c", border: "#d6d3d1" },
};

export default function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.NEW;

  return (
    <span
      className="admin-lead-status-badge"
      style={{
        background: style.bg,
        color: style.color,
        borderColor: style.border,
      }}
    >
      {getLeadStatusLabel(status)}
    </span>
  );
}
