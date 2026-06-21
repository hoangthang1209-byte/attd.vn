import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { countMediaAssets } from "@/features/media/services/media.service";
import { countClientLogos } from "@/features/client-logos/services/client-logo.service";
import { countCaseStudies } from "@/features/case-studies/services/case-study.service";
import { getCmsHealth } from "@/features/admin/services/cms-health.service";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CmsHealthCard from "@/components/admin/CmsHealthCard";

export default async function DashboardPage() {
  const [
    health,
    totalProducts,
    totalMedia,
    totalClientLogos,
    totalCaseStudies,
    activeProducts,
  ] = await Promise.all([
    getCmsHealth(),
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
      href: "/admin/products",
      action: "Quản lý sản phẩm",
    },
    {
      label: "Thư viện ảnh",
      value: totalMedia,
      sub: "Media assets",
      href: "/admin/media",
      action: "Mở thư viện",
    },
    {
      label: "Logo khách hàng",
      value: totalClientLogos,
      sub: "Client logos",
      href: "/admin/client-logos",
      action: "Quản lý logo",
    },
    {
      label: "Dự án tiêu biểu",
      value: totalCaseStudies,
      sub: "Case studies",
      href: "/admin/case-studies",
      action: "Quản lý dự án",
    },
  ];

  return (
    <>
      <AdminPageTitle title={"Dashboard"} />
      <div className="admin-dashboard-grid">
        <CmsHealthCard health={health} />
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
          <Link href="/admin/settings/company">Thông tin công ty</Link>
          <Link href="/admin/settings/trust">Chỉ số tin cậy</Link>
          <Link href="/admin/media">Tải ảnh lên</Link>
          <Link href="/admin/crm">CRM leads</Link>
        </div>
      </div>
    </>
  );
}
