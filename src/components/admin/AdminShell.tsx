import Link from "next/link";

const NAV = [
  { href: "/quan-tri/dashboard", label: "Dashboard" },
  { href: "/quan-tri/media", label: "Thư viện ảnh" },
  { href: "/quan-tri/products", label: "Sản phẩm" },
  { href: "/quan-tri/client-logos", label: "Logo khách hàng" },
  { href: "/quan-tri/case-studies", label: "Dự án tiêu biểu" },
  { href: "/quan-tri/settings/company", label: "Thông tin công ty" },
  { href: "/quan-tri/settings/trust", label: "Chỉ số tin cậy" },
  { href: "/quan-tri/khach-hang-tiem-nang", label: "CRM" },
  { href: "/quan-tri/bai-viet", label: "Bài viết" },
  { href: "/quan-tri/danh-muc", label: "Danh mục" },
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
        <Link href="/quan-tri/dashboard" className="admin-brand">
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
