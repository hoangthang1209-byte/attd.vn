import Link from "next/link";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/media", label: "Thư viện ảnh" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/client-logos", label: "Logo khách hàng" },
  { href: "/admin/case-studies", label: "Dự án tiêu biểu" },
  { href: "/admin/settings/company", label: "Thông tin công ty" },
  { href: "/admin/settings/trust", label: "Chỉ số tin cậy" },
  { href: "/admin/khach-hang-tiem-nang", label: "CRM" },
  { href: "/admin/bai-viet", label: "Bài viết" },
  { href: "/admin/danh-muc", label: "Danh mục" },
];

export default function AdminShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin/dashboard" className="admin-brand">
          ATTD CMS
        </Link>
        <nav className="admin-nav">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="admin-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        <h1 className="admin-title">{title}</h1>
        {children}
      </main>
    </div>
  );
}
