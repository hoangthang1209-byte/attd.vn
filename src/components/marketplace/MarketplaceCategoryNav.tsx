"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MarketplaceCategoryNavProps = {
  className?: string;
};

export default function MarketplaceCategoryNav({ className = "" }: MarketplaceCategoryNavProps) {
  const pathname = usePathname();

  const items = [
    { href: "/ao-thun-tron", label: "Áo thun trơn" },
    { href: "/ao-polo-tron", label: "Áo polo" },
    { href: "/non", label: "Nón" },
    { href: "/tote", label: "Tote bag" },
    { href: "/binh-giu-nhiet", label: "Bình giữ nhiệt" },
    { href: "/gift-set-doanh-nghiep", label: "Gift set" },
    { href: "/oem", label: "OEM" },
  ];

  return (
    <nav className={`mp-cat-nav ${className}`.trim()} aria-label="Danh mục nguồn hàng">
      <div className="mp-cat-nav-scroll">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

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
