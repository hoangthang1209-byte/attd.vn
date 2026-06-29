import PortalBusinessGuard from "@/components/portal/PortalBusinessGuard";

const TIERS = [50, 100, 300, 500, 1000];

export default function PortalPricingPage() {
  return (
    <PortalBusinessGuard>
      <div className="portal-page">
        <p className="portal-eyebrow">Pricing</p>
        <h1 className="portal-title">Bảng giá đại lý</h1>
        <p className="portal-lead">
          Giá theo tier số lượng B2B. Liên hệ sales hoặc gửi RFQ để nhận báo giá chính thức — không
          phải mua sắm trực tiếp như B2C.
        </p>
        <div className="portal-tier-grid">
          {TIERS.map((qty) => (
            <div key={qty} className="portal-tier-card">
              <strong>{qty.toLocaleString("vi-VN")}</strong>
              <span>pcs+</span>
            </div>
          ))}
        </div>
        <div className="portal-card portal-card--muted" style={{ marginTop: 24 }}>
          <p>
            Giá chi tiết theo SKU và nhóm giá B2B sẽ hiển thị sau khi catalog được kích hoạt. Hiện
            tại vui lòng gửi RFQ hoặc liên hệ sales.
          </p>
        </div>
      </div>
    </PortalBusinessGuard>
  );
}
