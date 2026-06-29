import type {
  DealerCompanyStatus,
  DealerCompanyType,
  DealerLevel,
  DealerUserRole,
  DealerUserStatus,
} from "@prisma/client";
import {
  DEALER_COMPANY_STATUS_LABELS,
  DEALER_COMPANY_TYPE_LABELS,
  DEALER_LEVEL_LABELS,
  DEALER_USER_ROLE_LABELS,
  DEALER_USER_STATUS_LABELS,
} from "@/features/dealer/labels";

const TYPE_STYLES: Record<DealerCompanyType, { bg: string; color: string }> = {
  DEALER: { bg: "#dbeafe", color: "#1d4ed8" },
  AGENCY: { bg: "#ede9fe", color: "#6d28d9" },
  PRINTING_COMPANY: { bg: "#ffedd5", color: "#c2410c" },
  EVENT_COMPANY: { bg: "#fce7f3", color: "#be185d" },
  CORPORATE_BUYER: { bg: "#ecfdf5", color: "#047857" },
  OEM_CLIENT: { bg: "#e0e7ff", color: "#4338ca" },
  OTHER: { bg: "#f3f4f6", color: "#374151" },
};

export function DealerCompanyTypeBadge({ type }: { type: DealerCompanyType }) {
  const style = TYPE_STYLES[type];
  return (
    <span className="admin-lead-status-badge" style={{ background: style.bg, color: style.color }}>
      {DEALER_COMPANY_TYPE_LABELS[type]}
    </span>
  );
}

const STATUS_STYLES: Record<DealerCompanyStatus, { bg: string; color: string }> = {
  PENDING: { bg: "#fef3c7", color: "#b45309" },
  APPROVED: { bg: "#dcfce7", color: "#15803d" },
  REJECTED: { bg: "#fee2e2", color: "#b91c1c" },
  SUSPENDED: { bg: "#f3f4f6", color: "#6b7280" },
};

export function DealerCompanyStatusBadge({ status }: { status: DealerCompanyStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className="admin-lead-status-badge" style={{ background: style.bg, color: style.color }}>
      {DEALER_COMPANY_STATUS_LABELS[status]}
    </span>
  );
}

const LEVEL_STYLES: Record<DealerLevel, { bg: string; color: string }> = {
  STANDARD: { bg: "#f3f4f6", color: "#374151" },
  SILVER: { bg: "#e5e7eb", color: "#4b5563" },
  GOLD: { bg: "#fef3c7", color: "#b45309" },
  PLATINUM: { bg: "#e0e7ff", color: "#4338ca" },
  DIAMOND: { bg: "#dbeafe", color: "#1d4ed8" },
};

export function DealerLevelBadge({ level }: { level: DealerLevel }) {
  const style = LEVEL_STYLES[level];
  return (
    <span className="admin-lead-status-badge" style={{ background: style.bg, color: style.color }}>
      {DEALER_LEVEL_LABELS[level]}
    </span>
  );
}

export function DealerUserRoleBadge({ role }: { role: DealerUserRole }) {
  return <span className="admin-meta-pill">{DEALER_USER_ROLE_LABELS[role]}</span>;
}

export function DealerUserStatusBadge({ status }: { status: DealerUserStatus }) {
  const style =
    status === "ACTIVE"
      ? { bg: "#dcfce7", color: "#15803d" }
      : status === "INVITED"
        ? { bg: "#eff6ff", color: "#2563eb" }
        : { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span className="admin-lead-status-badge" style={{ background: style.bg, color: style.color }}>
      {DEALER_USER_STATUS_LABELS[status]}
    </span>
  );
}
