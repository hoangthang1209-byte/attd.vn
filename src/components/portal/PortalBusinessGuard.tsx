import Link from "next/link";
import { getDealerPortalContext } from "@/lib/dealer-auth/get-dealer-portal-context";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PortalBusinessGuardProps = {
  children: React.ReactNode;
};

export default async function PortalBusinessGuard({ children }: PortalBusinessGuardProps) {
  const ctx = await getDealerPortalContext();

  if (ctx.kind === "anonymous") {
    redirect("/portal/login");
  }

  if (ctx.kind === "blocked") {
    return (
      <div className="portal-page">
        <h1 className="portal-title">Truy cập bị chặn</h1>
        <div className="portal-card portal-card--blocked">
          <p>Tài khoản B2B không thể sử dụng tính năng này. Liên hệ ATTD để được hỗ trợ.</p>
        </div>
      </div>
    );
  }

  if (ctx.kind === "pending") {
    return (
      <div className="portal-page">
        <h1 className="portal-title">Chờ duyệt hồ sơ</h1>
        <p className="portal-lead">
          Hồ sơ <strong>{ctx.companyName}</strong> đang chờ duyệt. Tính năng này sẽ mở sau khi ATTD
          phê duyệt.
        </p>
        <Link href="/portal/profile" className="portal-btn">
          Xem hồ sơ
        </Link>
      </div>
    );
  }

  return children;
}
