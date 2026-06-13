"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/ao-thun-tron", label: "Áo thun" },
  { href: "/ao-polo-tron", label: "Áo polo" },
  { href: "/non", label: "Nón" },
  { href: "/tote", label: "Tote" },
  { href: "/binh-giu-nhiet", label: "Bình giữ nhiệt" },
  { href: "/nguon-hang", label: "Nguồn hàng" },
  { href: "/dai-ly", label: "Đại lý" },
  { href: "/lien-he", label: "Liên hệ" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container">
        <div className="site-header-inner">
          <Link href="/" className="site-logo">
            ATTD
          </Link>

          <nav className="site-nav-desktop" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="site-nav-link">
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            aria-label={open ? "Đóng menu" : "Mở menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="site-nav-toggle"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <nav className="site-nav-mobile" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="site-nav-mobile-link"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
