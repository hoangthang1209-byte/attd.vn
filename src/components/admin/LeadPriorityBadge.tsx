import type { LeadPriority } from "@prisma/client";
import { CRM_PRIORITY_LABELS } from "@/features/crm/labels";

const PRIORITY_STYLES: Record<LeadPriority, { bg: string; color: string; border: string }> = {
  LOW: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" },
  NORMAL: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  HIGH: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  URGENT: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

export default function LeadPriorityBadge({ priority }: { priority: LeadPriority }) {
  const style = PRIORITY_STYLES[priority];

  return (
    <span
      className="admin-lead-status-badge"
      style={{
        background: style.bg,
        color: style.color,
        borderColor: style.border,
      }}
    >
      {CRM_PRIORITY_LABELS[priority]}
    </span>
  );
}
