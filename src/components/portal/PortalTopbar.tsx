"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DealerPortalContext } from "@/lib/dealer-auth/get-dealer-portal-context";

type PortalTopbarProps = {
  ctx: DealerPortalContext;
};

export default function PortalTopbar({ ctx }: PortalTopbarProps) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/portal/auth/logout", { method: "POST" });
    router.push("/portal/login");
    router.refresh();
  }

  return (
    <header className="portal-topbar">
      <Link href="/portal" className="portal-topbar-brand">
        ATTD B2B
      </Link>
      <div className="portal-topbar-actions">
        {ctx.kind === "anonymous" ? (
          <Link href="/portal/login" className="portal-btn portal-btn--primary">
            Đăng nhập
          </Link>
        ) : (
          <>
            <span style={{ fontSize: 13, color: "#737373" }}>
              {"userName" in ctx ? ctx.userName : ""}
            </span>
            <button type="button" className="portal-btn portal-btn--ghost" onClick={() => void logout()}>
              Đăng xuất
            </button>
          </>
        )}
      </div>
    </header>
  );
}
