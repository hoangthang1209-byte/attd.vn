import Link from "next/link";
import { getDealerPortalContext } from "@/lib/dealer-auth/get-dealer-portal-context";

export const dynamic = "force-dynamic";

const MVP_CARDS = [
  { title: "Báo giá gần đây", href: "/dealer/quotes", description: "Theo dõi báo giá B2B của đại lý" },
  { title: "Sản phẩm có thể đặt", href: "/san-pham", description: "Danh mục sản phẩm sỉ & OEM" },
  { title: "Nhóm giá đại lý", href: "/dealer/resources", description: "Chính sách giá theo cấp đại lý" },
  { title: "Yêu cầu báo giá", href: "/dealer/rfq", description: "Gửi RFQ B2B cho ATTD" },
  { title: "Tài nguyên đại lý", href: "/dealer/resources", description: "Catalog, tech pack, tài liệu hỗ trợ" },
];

export default async function DealerDashboardPage() {
  const ctx = await getDealerPortalContext();

  if (ctx.kind === "anonymous") {
    return (
      <div className="dealer-portal-page">
        <header className="dealer-portal-header">
          <p className="dealer-portal-eyebrow">ATTD B2B</p>
          <h1>Cổng đại lý</h1>
          <p className="dealer-portal-lead">
            Khu vực làm việc dành cho đại lý, agency, công ty in ấn, sự kiện và khách hàng doanh nghiệp.
          </p>
        </header>
        <section className="dealer-portal-card">
          <h2>Đăng nhập để tiếp tục</h2>
          <p>Vui lòng đăng nhập bằng tài khoản đại lý đã được ATTD duyệt.</p>
          <Link href="/dealer/login" className="dealer-portal-btn dealer-portal-btn--primary">
            Đăng nhập đại lý
          </Link>
        </section>
        <section className="dealer-portal-card dealer-portal-card--muted">
          <h2>Chưa có tài khoản?</h2>
          <p>Liên hệ đội ngũ ATTD hoặc gửi đăng ký qua trang đại lý để được xét duyệt.</p>
          <Link href="/dai-ly" className="dealer-portal-btn">
            Đăng ký làm đại lý
          </Link>
        </section>
      </div>
    );
  }

  if (ctx.kind === "pending") {
    return (
      <div className="dealer-portal-page">
        <header className="dealer-portal-header">
          <h1>Chờ duyệt hồ sơ</h1>
          <p className="dealer-portal-lead">
            Hồ sơ <strong>{ctx.companyName}</strong> đang chờ ATTD xét duyệt. Chúng tôi sẽ liên hệ khi tài khoản được kích hoạt.
          </p>
        </header>
        <section className="dealer-portal-card dealer-portal-card--warning">
          <p>Bạn chưa thể truy cập báo giá, RFQ và nhóm giá cho đến khi hồ sơ được duyệt.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="dealer-portal-page">
      <header className="dealer-portal-header">
        <p className="dealer-portal-eyebrow">Xin chào, {ctx.companyName}</p>
        <h1>Bảng điều khiển đại lý</h1>
        {ctx.priceGroupName && (
          <p className="dealer-portal-lead">Nhóm giá: {ctx.priceGroupName}</p>
        )}
      </header>
      <div className="dealer-portal-grid">
        {MVP_CARDS.map((card) => (
          <Link key={card.title} href={card.href} className="dealer-portal-card dealer-portal-card--link">
            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
