import type { ReactNode } from "react";

type AdminMobileActionBarProps = {
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  ariaLabel?: string;
};

/**
 * Fixed bottom action bar for admin list/form pages on phone viewports.
 * Hidden on desktop via CSS. Pair with `admin-page-shell--mobile-actions` padding.
 */
export default function AdminMobileActionBar({
  primaryAction,
  secondaryAction,
  ariaLabel = "Thao tác nhanh",
}: AdminMobileActionBarProps) {
  return (
    <div className="admin-mobile-action-bar" role="group" aria-label={ariaLabel}>
      {secondaryAction && (
        <div className="admin-mobile-action-bar__secondary">{secondaryAction}</div>
      )}
      <div className="admin-mobile-action-bar__primary">{primaryAction}</div>
    </div>
  );
}
