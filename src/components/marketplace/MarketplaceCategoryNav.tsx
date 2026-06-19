"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MARKETPLACE_CATEGORY_NAV } from "@/lib/navConfig";

type MarketplaceCategoryNavProps = {
  className?: string;
};

export default function MarketplaceCategoryNav({ className = "" }: MarketplaceCategoryNavProps) {
  const pathname = usePathname();

  return (
    <nav className={`mp-cat-nav ${className}`.trim()} aria-label="Danh mục nguồn hàng">
      <div className="mp-cat-nav-scroll">
        {MARKETPLACE_CATEGORY_NAV.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (pathname === "/san-pham" && item.href.startsWith("/san-pham"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mp-cat-nav-item${active ? " mp-cat-nav-item--active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
