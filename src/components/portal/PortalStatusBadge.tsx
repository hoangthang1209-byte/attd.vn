import type { DealerCompanyStatus, DealerLevel } from "@prisma/client";
import {
  DEALER_COMPANY_STATUS_LABELS,
  DEALER_LEVEL_LABELS,
} from "@/features/dealer/labels";

type PortalStatusBadgeProps = {
  status: DealerCompanyStatus;
};

export default function PortalStatusBadge({ status }: PortalStatusBadgeProps) {
  const label = DEALER_COMPANY_STATUS_LABELS[status];
  const variant =
    status === "APPROVED"
      ? "approved"
      : status === "PENDING"
        ? "pending"
        : "blocked";

  return <span className={`portal-badge portal-badge--${variant}`}>{label}</span>;
}

export function PortalLevelBadge({ level }: { level: DealerLevel }) {
  return (
    <span className="portal-badge portal-badge--level">{DEALER_LEVEL_LABELS[level]}</span>
  );
}
