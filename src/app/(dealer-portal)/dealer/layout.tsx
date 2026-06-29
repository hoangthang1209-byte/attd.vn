import Link from "next/link";
import "./dealer-portal.css";

const NAV = [
  { href: "/dealer", label: "Tổng quan" },
  { href: "/dealer/rfq", label: "Yêu cầu báo giá" },
  { href: "/dealer/quotes", label: "Báo giá" },
  { href: "/dealer/resources", label: "Tài nguyên" },
];

export default function DealerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dealer-portal-shell">
      <header className="dealer-portal-topbar">
        <Link href="/dealer" className="dealer-portal-brand">
          ATTD <span>Dealer Portal</span>
        </Link>
        <nav className="dealer-portal-nav" aria-label="Điều hướng đại lý">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="dealer-portal-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/dealer/login" className="dealer-portal-topbar-login">
          Đăng nhập
        </Link>
      </header>
      <main className="dealer-portal-main">{children}</main>
      <footer className="dealer-portal-footer">
        <p>Khu vực làm việc B2B — không phải cửa hàng B2C. Liên hệ ATTD để được duyệt tài khoản đại lý.</p>
      </footer>
    </div>
  );
}
