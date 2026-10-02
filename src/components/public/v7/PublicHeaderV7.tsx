"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Search, X } from "lucide-react";
import AttdLogo from "@/components/public/AttdLogo";
import TrackedLink from "@/components/analytics/TrackedLink";
import type { MarketplaceCategoryTreeNode } from "@/features/categories/marketplace-category-tree";

const SOLUTIONS = [
  { href: "/dong-phuc-doanh-nghiep", label: "Đồng phục doanh nghiệp", desc: "Tư vấn, sản xuất và giao đồng phục" },
  { href: "/nguon-hang", label: "Nguồn hàng B2B", desc: "Hàng trơn và nguồn sản phẩm B2B" },
  { href: "/oem", label: "OEM / Private Label", desc: "Làm sản phẩm theo yêu cầu riêng" },
  { href: "/qua-tang-doanh-nghiep", label: "Quà tặng doanh nghiệp", desc: "Quà tặng theo ngân sách và chương trình" },
  { href: "/merchandise", label: "Merchandise", desc: "Cho nghệ sĩ, concert và sự kiện" },
] as const;

const NAV = [
  { href: "/#nang-luc", label: "Năng lực" },
  { href: "/gioi-thieu", label: "Về ATTD" },
] as const;

export default function PublicHeaderV7({
  logoUrl,
  categoryTree,
}: {
  logoUrl?: string | null;
  categoryTree: MarketplaceCategoryTreeNode[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const solutionActive = SOLUTIONS.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const productActive = pathname === "/san-pham" || categoryTree.some((group) =>
    pathname === group.viewAllHref || group.children.some((child) => pathname === child.href),
  );

  return (
    <header className="v7-header">
      <div className="container v7-header__inner">
        <AttdLogo src={logoUrl} className="v7-header__logo" />

        <nav className="v7-header__nav" aria-label="Điều hướng chính">
          <div className={`v7-header__solutions${solutionActive ? " is-active" : ""}`}>
            <Link href="/#giai-phap">Giải pháp</Link>
            <div className="v7-header__solutions-panel">
              <div className="v7-header__solutions-intro">
                <span>ATTD có thể hỗ trợ</span>
                <strong>Bạn đang cần làm gì?</strong>
                <p>Chọn nhu cầu phù hợp để xem cách triển khai.</p>
              </div>
              <div className="v7-header__solutions-links">
                {SOLUTIONS.map((item, index) => (
                  <Link key={item.href} href={item.href}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.desc}</small>
                    </div>
                    <b aria-hidden>↗</b>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className={`v7-header__products${productActive ? " is-active" : ""}`}>
            <Link href="/san-pham">Sản phẩm</Link>
            <div className="v7-header__products-panel">
              <div className="v7-header__products-top">
                <div>
                  <span>Danh mục sản phẩm</span>
                  <strong>Tìm nhanh theo nhóm sản phẩm.</strong>
                </div>
                <Link href="/danh-muc-san-pham">Xem tất cả danh mục ↗</Link>
              </div>
              <div className="v7-header__products-grid">
                {categoryTree.slice(0, 4).map((group) => (
                  <div key={group.id}>
                    <Link href={group.viewAllHref} className="v7-header__products-parent">
                      {group.name}
                    </Link>
                    {group.children.slice(0, 5).map((child) => (
                      <Link key={child.id} href={child.href} className="v7-header__products-child">
                        {child.name}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

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
            <span>Tìm sản phẩm</span>
          </Link>
          <TrackedLink
            href="/lien-he"
            trackEvent="contact_quote"
            trackSource="HEADER"
            className="v7-btn v7-btn--primary"
          >
            Nhận báo giá
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
            <span className="v7-mobile-nav__label">Giải pháp</span>
            {SOLUTIONS.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}<span>↗</span>
              </Link>
            ))}
            <span className="v7-mobile-nav__label">Sản phẩm</span>
            <Link href="/san-pham" onClick={() => setOpen(false)}>Tất cả sản phẩm<span>↗</span></Link>
            {categoryTree.slice(0, 5).map((group) => (
              <Link key={group.id} href={group.viewAllHref} onClick={() => setOpen(false)}>
                {group.name}<span>↗</span>
              </Link>
            ))}
            <span className="v7-mobile-nav__label">ATTD</span>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}<span>↗</span>
              </Link>
            ))}
            <Link href="/lien-he" className="v7-btn v7-btn--primary" onClick={() => setOpen(false)}>
              Nhận tư vấn & báo giá
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
