import Link from "next/link";
import PortalLoginForm from "@/components/portal/PortalLoginForm";
import { getDealerPortalContext } from "@/lib/dealer-auth/get-dealer-portal-context";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalLoginPage() {
  const ctx = await getDealerPortalContext();
  if (ctx.kind !== "anonymous") {
    redirect("/portal");
  }

  return (
    <div className="portal-page portal-page--narrow">
      <p className="portal-eyebrow">ATTD B2B Portal</p>
      <h1 className="portal-title">Đăng nhập</h1>
      <p className="portal-lead">Sử dụng email B2B và mật khẩu do ATTD cấp.</p>
      <div className="portal-card">
        <PortalLoginForm />
      </div>
      <p style={{ marginTop: 16, fontSize: 13, color: "#737373" }}>
        Chưa có tài khoản?{" "}
        <Link href="/dai-ly" style={{ color: "#171717", fontWeight: 600 }}>
          Đăng ký làm đối tác B2B
        </Link>
      </p>
    </div>
  );
}
