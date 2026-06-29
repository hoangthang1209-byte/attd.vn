import PortalBusinessGuard from "@/components/portal/PortalBusinessGuard";
import PortalEmptyState from "@/components/portal/PortalEmptyState";

export default function PortalOrdersPage() {
  return (
    <PortalBusinessGuard>
      <div className="portal-page">
        <p className="portal-eyebrow">Orders</p>
        <h1 className="portal-title">Đơn hàng B2B</h1>
        <p className="portal-lead">Theo dõi trạng thái đơn hàng, sản xuất và giao hàng.</p>
        <PortalEmptyState
          title="Chưa có đơn hàng"
          description="Đơn hàng B2B và lịch sử đặt lại sẽ hiển thị tại đây."
        />
      </div>
    </PortalBusinessGuard>
  );
}
