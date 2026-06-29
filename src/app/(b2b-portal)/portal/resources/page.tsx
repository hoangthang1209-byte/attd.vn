import Link from "next/link";
import { getDealerPortalContext } from "@/lib/dealer-auth/get-dealer-portal-context";
import { redirect } from "next/navigation";
import PortalEmptyState from "@/components/portal/PortalEmptyState";

export const dynamic = "force-dynamic";

export default async function PortalResourcesPage() {
  const ctx = await getDealerPortalContext();
  if (ctx.kind === "anonymous") {
    redirect("/portal/login");
  }

  const locked = ctx.kind === "pending";

  return (
    <div className="portal-page">
      <p className="portal-eyebrow">Resources</p>
      <h1 className="portal-title">Tài nguyên đại lý</h1>
      <p className="portal-lead">
        Catalog PDF, tech pack, pattern, tài liệu marketing và hướng dẫn sản phẩm.
      </p>
      {locked ? (
        <div className="portal-card portal-card--warning">
          <p>Tài nguyên đầy đủ sẽ mở sau khi hồ sơ B2B được duyệt.</p>
        </div>
      ) : (
        <PortalEmptyState
          title="Thư viện tài nguyên sắp ra mắt"
          description="File catalog, tech pack và marketing sẽ được tải tại đây."
        />
      )}
      <Link href="/portal" className="portal-btn" style={{ marginTop: 16 }}>
        Về workspace
      </Link>
    </div>
  );
}
