import Link from "next/link";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";

const NAV_GROUPS = [
  {
    label: null as string | null,
    items: [{ href: "/admin/dashboard", label: "Tổng quan" }],
  },
  {
    label: "Sản phẩm",
    items: [
      { href: "/admin/products", label: "Danh sách sản phẩm" },
      { href: "/admin/products/new", label: "Thêm sản phẩm" },
      { href: "/admin/products/import", label: "Nhập Excel/CSV" },
      { href: "/admin/danh-muc", label: "Danh mục sản phẩm" },
      { href: "/admin/products/attributes", label: "Thuộc tính sản phẩm" },
      { href: "/admin/media", label: "Thư viện Media" },
    ],
  },
  {
    label: "Knowledge Base",
    items: [
      { href: "/admin/knowledge-base", label: "Danh sách KB" },
      { href: "/admin/knowledge-base?import=1", label: "Nhập dữ liệu KB" },
      { href: "/admin/knowledge-base/context-preview", label: "Xem trước ngữ cảnh AI" },
    ],
  },
  {
    label: "SEO & Content",
    items: [
      { href: "/admin/blog", label: "Blog" },
      { href: "/admin/landing-pages", label: "Landing pages" },
      { href: "/admin/seo-planning", label: "SEO Planning" },
      { href: "/admin/seo/brief-generator", label: "SEO Brief Generator" },
      { href: "/admin/ai-content-factory", label: "AI Content Factory" },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/admin/crm", label: "CRM" },
      { href: "/admin/crm/leads", label: "Lead" },
      { href: "/admin/crm/customers", label: "Khách hàng" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/client-logos", label: "Logo khách hàng" },
      { href: "/admin/case-studies", label: "Dự án tiêu biểu" },
    ],
  },
  {
    label: "Cài đặt",
    items: [
      { href: "/admin/settings/company", label: "Thông tin công ty" },
      { href: "/admin/settings/trust", label: "Chỉ số tin cậy" },
      { href: "/admin/settings/branding", label: "Nhận diện thương hiệu" },
      { href: "/admin/demo", label: "🎭 Dữ liệu demo" },
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
        <div className="admin-sidebar-top">
          <Link href="/admin/dashboard" className="admin-brand">
            ATTD CMS
          </Link>
          <AdminLogoutButton />
        </div>
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
