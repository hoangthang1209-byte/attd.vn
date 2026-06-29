import Link from "next/link";
import PortalActionCard from "@/components/portal/PortalActionCard";
import PortalEmptyState from "@/components/portal/PortalEmptyState";
import PortalStatusBadge, { PortalLevelBadge } from "@/components/portal/PortalStatusBadge";
import { DEALER_ACTIVITY_TYPE_LABELS } from "@/features/dealer/labels";
import { getDealerPortalContext } from "@/lib/dealer-auth/get-dealer-portal-context";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { title: "Gửi RFQ", description: "Gửi yêu cầu báo giá B2B", href: "/portal/rfq" },
  { title: "Xem bảng giá", description: "Giá theo tier và nhóm giá", href: "/portal/pricing" },
  { title: "Tạo báo giá", description: "Quản lý báo giá B2B", href: "/portal/quotes" },
  { title: "Đặt mẫu", description: "Yêu cầu mẫu sản phẩm (sắp ra mắt)", href: undefined },
  { title: "Tải tài nguyên", description: "Catalog, tech pack, tài liệu", href: "/portal/resources" },
  { title: "Liên hệ sales", description: "Hỗ trợ từ đội ngũ ATTD", href: "/portal/support" },
];

export default async function PortalWorkspacePage() {
  const ctx = await getDealerPortalContext();

  if (ctx.kind === "anonymous") {
    return (
      <div className="portal-page portal-page--narrow">
        <p className="portal-eyebrow">ATTD B2B Portal</p>
        <h1 className="portal-title">Cổng làm việc B2B</h1>
        <p className="portal-lead">
          Dành cho đại lý, agency, công ty in ấn, sự kiện và khách hàng doanh nghiệp. Đăng nhập để
          tiếp tục.
        </p>
        <div className="portal-card">
          <h2>Đăng nhập</h2>
          <p style={{ marginBottom: 16 }}>Sử dụng email và mật khẩu do ATTD cấp.</p>
          <Link href="/portal/login" className="portal-btn portal-btn--primary">
            Đăng nhập B2B
          </Link>
        </div>
      </div>
    );
  }

  if (ctx.kind === "blocked") {
    return (
      <div className="portal-page">
        <h1 className="portal-title">Tài khoản bị khóa</h1>
        <div className="portal-card portal-card--blocked">
          <p>
            Hồ sơ <strong>{ctx.companyName}</strong> đang ở trạng thái không thể sử dụng. Vui lòng
            liên hệ ATTD để được hỗ trợ.
          </p>
        </div>
      </div>
    );
  }

  if (ctx.kind === "pending") {
    return (
      <div className="portal-page">
        <p className="portal-eyebrow">Xin chào, {ctx.userName}</p>
        <h1 className="portal-title">Tài khoản B2B của bạn đang chờ duyệt</h1>
        <p className="portal-lead">
          Hồ sơ <strong>{ctx.companyName}</strong> đang được đội ngũ sales ATTD xem xét. Chúng tôi
          sẽ liên hệ khi tài khoản được kích hoạt đầy đủ.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <PortalStatusBadge status="PENDING" />
          <PortalLevelBadge level={ctx.companyLevel} />
        </div>
        <div className="portal-card portal-card--warning">
          <p>
            Bạn có thể xem hồ sơ cá nhân. RFQ, bảng giá, báo giá và đơn hàng sẽ mở sau khi hồ sơ
            được duyệt.
          </p>
        </div>
        <div style={{ marginTop: 16 }}>
          <Link href="/portal/profile" className="portal-btn">
            Xem hồ sơ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <p className="portal-eyebrow">Xin chào, {ctx.userName}</p>
      <h1 className="portal-title">{ctx.companyName}</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <PortalStatusBadge status="APPROVED" />
        <PortalLevelBadge level={ctx.companyLevel} />
      </div>
      {ctx.priceGroupName && (
        <p className="portal-lead" style={{ marginBottom: 0 }}>
          Nhóm giá: {ctx.priceGroupName}
        </p>
      )}

      <h2 className="portal-hero-question">Bạn muốn làm gì hôm nay?</h2>
      <div className="portal-grid">
        {QUICK_ACTIONS.map((action) => (
          <PortalActionCard
            key={action.title}
            title={action.title}
            description={action.description}
            href={action.href}
            disabled={!action.href}
          />
        ))}
      </div>

      <section className="portal-section">
        <h2>Việc đang xử lý</h2>
        <PortalEmptyState
          title="Chưa có việc đang xử lý"
          description="RFQ và báo giá sẽ hiển thị tại đây khi bạn bắt đầu gửi yêu cầu."
        />
      </section>

      <section className="portal-section">
        <h2>Hoạt động gần đây</h2>
        {ctx.recentActivities.length === 0 ? (
          <PortalEmptyState
            title="Chưa có hoạt động"
            description="Lịch sử hoạt động B2B sẽ xuất hiện tại đây."
          />
        ) : (
          <ul className="portal-activity-list">
            {ctx.recentActivities.map((activity) => (
              <li key={activity.id} className="portal-activity-item">
                <div>
                  <strong>{activity.title}</strong>
                  <div style={{ color: "#737373", marginTop: 2 }}>
                    {DEALER_ACTIVITY_TYPE_LABELS[activity.type]}
                  </div>
                </div>
                <time dateTime={activity.createdAt}>
                  {new Date(activity.createdAt).toLocaleDateString("vi-VN")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="portal-section">
        <h2>Sản phẩm gợi ý</h2>
        <PortalEmptyState
          title="Catalog B2B sắp ra mắt"
          description="Sản phẩm gợi ý theo ngành và lịch sử RFQ sẽ hiển thị tại đây."
        />
      </section>

      <section className="portal-section">
        <h2>Tài nguyên đại lý</h2>
        <Link href="/portal/resources" className="portal-btn">
          Xem tài nguyên
        </Link>
      </section>
    </div>
  );
}
