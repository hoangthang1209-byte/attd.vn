import Link from "next/link";

const NAV_GROUPS = [
  {
    label: null as string | null,
    items: [{ href: "/admin/dashboard", label: "Dashboard" }],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/media", label: "Thư viện ảnh" },
      { href: "/admin/products", label: "Sản phẩm" },
      { href: "/admin/danh-muc", label: "Danh mục" },
      { href: "/admin/landing-pages", label: "Landing pages" },
      { href: "/admin/blog", label: "Blog" },
      { href: "/admin/seo-planning", label: "SEO Planning" },
      { href: "/admin/knowledge-base", label: "Knowledge Base" },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/crm", label: "CRM" },
      { href: "/admin/client-logos", label: "Logo khách hàng" },
      { href: "/admin/case-studies", label: "Dự án tiêu biểu" },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/settings/company", label: "Thông tin công ty" },
      { href: "/admin/settings/trust", label: "Chỉ số tin cậy" },
      { href: "/admin/settings/branding", label: "Nhận diện thương hiệu" },
    ],
  },
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
          {NAV_GROUPS.map((group) => (
            <div key={group.label ?? "root"} className="admin-nav-group">
              {group.label && <p className="admin-nav-group-label">{group.label}</p>}
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    group.label === "Settings"
                      ? "admin-nav-link admin-nav-link--nested"
                      : "admin-nav-link"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </div>
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
