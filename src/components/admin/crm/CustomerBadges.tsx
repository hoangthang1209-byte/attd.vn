import type { CustomerStatus, CustomerType } from "@prisma/client";
import { CUSTOMER_STATUS_LABELS, CUSTOMER_TYPE_LABELS } from "@/features/crm/labels";

const TYPE_STYLES: Record<CustomerType, { bg: string; color: string }> = {
  DEALER: { bg: "#dbeafe", color: "#1d4ed8" },
  AGENCY: { bg: "#ede9fe", color: "#6d28d9" },
  PRINTER: { bg: "#ffedd5", color: "#c2410c" },
  EVENT_COMPANY: { bg: "#fce7f3", color: "#be185d" },
  BUSINESS: { bg: "#ecfdf5", color: "#047857" },
  RETAIL: { bg: "#f3f4f6", color: "#374151" },
  SUPPLIER: { bg: "#fef3c7", color: "#b45309" },
  OTHER: { bg: "#f5f5f4", color: "#78716c" },
};

export function CustomerTypeBadge({ type }: { type: CustomerType }) {
  const style = TYPE_STYLES[type];
  return (
    <span className="admin-lead-status-badge" style={{ background: style.bg, color: style.color }}>
      {CUSTOMER_TYPE_LABELS[type]}
    </span>
  );
}

const STATUS_STYLES: Record<CustomerStatus, { bg: string; color: string }> = {
  PROSPECT: { bg: "#eff6ff", color: "#2563eb" },
  ACTIVE: { bg: "#dcfce7", color: "#15803d" },
  INACTIVE: { bg: "#f3f4f6", color: "#6b7280" },
  VIP: { bg: "#fef3c7", color: "#b45309" },
  BLACKLISTED: { bg: "#fee2e2", color: "#b91c1c" },
};

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className="admin-lead-status-badge" style={{ background: style.bg, color: style.color }}>
      {CUSTOMER_STATUS_LABELS[status]}
    </span>
  );
}
