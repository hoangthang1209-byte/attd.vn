"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DealerPortalContext } from "@/lib/dealer-auth/get-dealer-portal-context";

const NAV_ITEMS = [
  { href: "/portal", label: "Workspace", exact: true },
  { href: "/portal/rfq", label: "RFQ" },
  { href: "/portal/catalog", label: "Catalog" },
  { href: "/portal/pricing", label: "Pricing" },
  { href: "/portal/quotes", label: "Quotes" },
  { href: "/portal/orders", label: "Orders" },
  { href: "/portal/resources", label: "Resources" },
  { href: "/portal/support", label: "Support" },
];

type PortalSidebarProps = {
  ctx: DealerPortalContext;
};

export default function PortalSidebar({ ctx }: PortalSidebarProps) {
  const pathname = usePathname();
  const businessLocked = ctx.kind === "pending" || ctx.kind === "anonymous";

  return (
    <aside className="portal-sidebar">
      <div className="portal-sidebar-brand">
        <Link href="/portal">ATTD B2B Portal</Link>
        <span>Khu vực làm việc doanh nghiệp</span>
      </div>
      <nav className="portal-sidebar-nav" aria-label="Portal navigation">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const isBusiness =
            item.href !== "/portal" &&
            item.href !== "/portal/support" &&
            item.href !== "/portal/resources";
          const locked = businessLocked && isBusiness;

          return (
            <Link
              key={item.href}
              href={locked ? "/portal" : item.href}
              className={`portal-sidebar-link${active ? " portal-sidebar-link--active" : ""}`}
              aria-disabled={locked}
              title={locked ? "Chờ duyệt hồ sơ B2B" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
        {ctx.kind !== "anonymous" && (
          <Link
            href="/portal/profile"
            className={`portal-sidebar-link${pathname === "/portal/profile" ? " portal-sidebar-link--active" : ""}`}
          >
            Hồ sơ
          </Link>
        )}
      </nav>
      <div className="portal-sidebar-footer">ATTD B2B — không phải cửa hàng B2C</div>
    </aside>
  );
}
