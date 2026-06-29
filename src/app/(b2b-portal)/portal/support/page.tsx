import Link from "next/link";
import { getDealerPortalContext } from "@/lib/dealer-auth/get-dealer-portal-context";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalSupportPage() {
  const ctx = await getDealerPortalContext();
  if (ctx.kind === "anonymous") {
    redirect("/portal/login");
  }

  return (
    <div className="portal-page">
      <p className="portal-eyebrow">Support</p>
      <h1 className="portal-title">Liên hệ sales</h1>
      <p className="portal-lead">
        Đội ngũ ATTD hỗ trợ đối tác B2B về báo giá, đơn hàng và tài khoản.
      </p>
      <div className="portal-grid portal-grid--2">
        <div className="portal-card">
          <h3>Email</h3>
          <p>
            <a href="mailto:sales@attd.vn" style={{ color: "#171717", fontWeight: 600 }}>
              sales@attd.vn
            </a>
          </p>
        </div>
        <div className="portal-card">
          <h3>Hotline</h3>
          <p>Liên hệ qua trang chủ ATTD hoặc người phụ trách tài khoản của bạn.</p>
        </div>
      </div>
      <Link href="/lien-he" className="portal-btn portal-btn--primary" style={{ marginTop: 20 }}>
        Trang liên hệ ATTD
      </Link>
    </div>
  );
}
