import type { CustomerStatus } from "@prisma/client";
import { CUSTOMER_STATUS_LABELS } from "@/features/crm/labels";

export function CustomerMasterTypeBadge({ label }: { label: string | null | undefined }) {
  if (!label) {
    return <span className="admin-field-hint">Chưa phân loại</span>;
  }
  return (
    <span
      className="admin-lead-status-badge"
      style={{ background: "#ecfdf5", color: "#047857" }}
    >
      {label}
    </span>
  );
}

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const styles: Record<CustomerStatus, { bg: string; color: string }> = {
    PROSPECT: { bg: "#eff6ff", color: "#2563eb" },
    ACTIVE: { bg: "#dcfce7", color: "#15803d" },
    INACTIVE: { bg: "#f3f4f6", color: "#6b7280" },
    VIP: { bg: "#fef3c7", color: "#b45309" },
    BLACKLISTED: { bg: "#fee2e2", color: "#b91c1c" },
  };
  const style = styles[status];
  return (
    <span className="admin-lead-status-badge" style={{ background: style.bg, color: style.color }}>
      {CUSTOMER_STATUS_LABELS[status]}
    </span>
  );
}
