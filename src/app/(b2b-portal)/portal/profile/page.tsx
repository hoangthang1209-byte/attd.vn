import Link from "next/link";
import PortalStatusBadge, { PortalLevelBadge } from "@/components/portal/PortalStatusBadge";
import {
  DEALER_COMPANY_TYPE_LABELS,
  DEALER_USER_ROLE_LABELS,
} from "@/features/dealer/labels";
import { getDealerPortalContext } from "@/lib/dealer-auth/get-dealer-portal-context";
import type { DealerCompanyStatus, DealerCompanyType } from "@prisma/client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const ctx = await getDealerPortalContext();
  if (ctx.kind === "anonymous") {
    redirect("/portal/login");
  }

  const companyStatus: DealerCompanyStatus =
    ctx.kind === "approved" ? "APPROVED" : ctx.kind === "pending" ? "PENDING" : ctx.companyStatus;

  const companyType =
    ctx.kind === "approved" || ctx.kind === "pending"
      ? (ctx.companyType as DealerCompanyType)
      : "DEALER";

  const role = ctx.kind === "approved" || ctx.kind === "pending" ? ctx.role : null;

  return (
    <div className="portal-page">
      <p className="portal-eyebrow">Profile</p>
      <h1 className="portal-title">Hồ sơ B2B</h1>
      <p className="portal-lead">Thông tin công ty và tài khoản — chỉ xem (read-only).</p>

      <div className="portal-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <PortalStatusBadge status={companyStatus} />
          {(ctx.kind === "approved" || ctx.kind === "pending") && (
            <PortalLevelBadge level={ctx.companyLevel} />
          )}
        </div>
        <dl className="portal-profile-dl">
          <dt>Công ty</dt>
          <dd>{ctx.companyName}</dd>
          <dt>Loại hình</dt>
          <dd>{DEALER_COMPANY_TYPE_LABELS[companyType]}</dd>
          <dt>Họ tên</dt>
          <dd>{ctx.userName}</dd>
          {role && (
            <>
              <dt>Vai trò</dt>
              <dd>{DEALER_USER_ROLE_LABELS[role]}</dd>
            </>
          )}
          {"userEmail" in ctx && (
            <>
              <dt>Email</dt>
              <dd>{ctx.userEmail}</dd>
            </>
          )}
          {ctx.kind === "approved" && ctx.priceGroupName && (
            <>
              <dt>Nhóm giá</dt>
              <dd>{ctx.priceGroupName}</dd>
            </>
          )}
        </dl>
      </div>

      <Link href="/portal" className="portal-btn">
        Về workspace
      </Link>
    </div>
  );
}
