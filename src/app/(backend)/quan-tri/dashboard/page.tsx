import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { countMediaAssets } from "@/features/media/services/media.service";
import { countClientLogos } from "@/features/client-logos/services/client-logo.service";
import { countCaseStudies } from "@/features/case-studies/services/case-study.service";
import AdminShell from "@/components/admin/AdminShell";

export default async function DashboardPage() {
  const [
    totalProducts,
    totalMedia,
    totalClientLogos,
    totalCaseStudies,
    activeProducts,
  ] = await Promise.all([
    prisma.product.count(),
    countMediaAssets(),
    countClientLogos(),
    countCaseStudies(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
  ]);

  const cmsCards = [
    {
      label: "Sản phẩm",
      value: totalProducts,
      sub: `${activeProducts} đang publish`,
      href: "/quan-tri/products",
      action: "Quản lý sản phẩm",
    },
    {
      label: "Thư viện ảnh",
      value: totalMedia,
      sub: "Media assets",
      href: "/quan-tri/media",
      action: "Mở thư viện",
    },
    {
      label: "Logo khách hàng",
      value: totalClientLogos,
      sub: "Client logos",
      href: "/quan-tri/client-logos",
      action: "Quản lý logo",
    },
    {
      label: "Dự án tiêu biểu",
      value: totalCaseStudies,
      sub: "Case studies",
      href: "/quan-tri/case-studies",
      action: "Quản lý dự án",
    },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="admin-dashboard-grid">
        {cmsCards.map((card) => (
          <div key={card.href} className="admin-dashboard-card">
            <p className="admin-dashboard-label">{card.label}</p>
            <p className="admin-dashboard-value">{card.value}</p>
            <p className="admin-dashboard-sub">{card.sub}</p>
            <Link href={card.href} className="admin-dashboard-link">
              {card.action} →
            </Link>
          </div>
        ))}
      </div>

      <div className="admin-quick-actions">
        <h2 className="admin-subtitle">Thiết lập nhanh</h2>
        <div className="admin-quick-grid">
          <Link href="/quan-tri/settings/company">Thông tin công ty</Link>
          <Link href="/quan-tri/settings/trust">Chỉ số tin cậy</Link>
          <Link href="/quan-tri/media">Tải ảnh lên</Link>
          <Link href="/quan-tri/khach-hang-tiem-nang">CRM leads</Link>
        </div>
      </div>
    </AdminShell>
  );
}
