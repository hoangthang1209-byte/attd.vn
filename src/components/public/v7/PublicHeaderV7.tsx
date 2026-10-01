"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Search, X } from "lucide-react";
import AttdLogo from "@/components/public/AttdLogo";
import TrackedLink from "@/components/analytics/TrackedLink";

const NAV = [
  { href: "/#giai-phap", label: "Giải pháp" },
  { href: "/san-pham", label: "Sản phẩm" },
  { href: "/#nang-luc", label: "Năng lực" },
  { href: "/gioi-thieu", label: "Về ATTD" },
] as const;

export default function PublicHeaderV7({ logoUrl }: { logoUrl?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="v7-header">
      <div className="container v7-header__inner">
        <AttdLogo src={logoUrl} className="v7-header__logo" />

        <nav className="v7-header__nav" aria-label="Điều hướng chính">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "is-active" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="v7-header__actions">
          <Link href="/san-pham" className="v7-header__search" aria-label="Tìm sản phẩm">
            <Search size={18} />
            <span>Tìm nguồn hàng</span>
          </Link>
          <TrackedLink
            href="/lien-he"
            trackEvent="contact_quote"
            trackSource="HEADER"
            className="v7-btn v7-btn--primary"
          >
            Yêu cầu báo giá
          </TrackedLink>
        </div>

        <button
          type="button"
          className="v7-header__menu-button"
          aria-label={open ? "Đóng menu" : "Mở menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open ? (
        <div className="v7-mobile-nav">
          <nav className="container" aria-label="Điều hướng mobile">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}<span>↗</span>
              </Link>
            ))}
            <Link href="/nguon-hang" onClick={() => setOpen(false)}>Nguồn hàng B2B<span>↗</span></Link>
            <Link href="/oem" onClick={() => setOpen(false)}>OEM / Private Label<span>↗</span></Link>
            <Link href="/merchandise" onClick={() => setOpen(false)}>Merchandise<span>↗</span></Link>
            <Link href="/lien-he" className="v7-btn v7-btn--primary" onClick={() => setOpen(false)}>
              Gửi yêu cầu
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
