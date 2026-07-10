"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MARKETPLACE_CATEGORY_NAV } from "@/lib/navConfig";

type NavItem = {
  href: string;
  label: string;
  openInNewTab?: boolean;
};

type MarketplaceCategoryNavProps = {
  className?: string;
  links?: NavItem[];
};

export default function MarketplaceCategoryNav({
  className = "",
  links = MARKETPLACE_CATEGORY_NAV,
}: MarketplaceCategoryNavProps) {
  const pathname = usePathname();

  return (
    <nav className={`mp-cat-nav ${className}`.trim()} aria-label="Danh mục nguồn hàng">
      <div className="mp-cat-nav-scroll">
        {links.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (pathname === "/san-pham" && item.href.startsWith("/san-pham"));

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`mp-cat-nav-item${active ? " mp-cat-nav-item--active" : ""}`}
              target={item.openInNewTab ? "_blank" : undefined}
              rel={item.openInNewTab ? "noopener noreferrer" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
