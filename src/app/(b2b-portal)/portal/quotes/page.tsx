import PortalBusinessGuard from "@/components/portal/PortalBusinessGuard";
import PortalEmptyState from "@/components/portal/PortalEmptyState";

export default function PortalQuotesPage() {
  return (
    <PortalBusinessGuard>
      <div className="portal-page">
        <p className="portal-eyebrow">Quotes</p>
        <h1 className="portal-title">Báo giá của bạn</h1>
        <p className="portal-lead">Theo dõi báo giá B2B được gửi cho công ty của bạn.</p>
        <PortalEmptyState
          title="Chưa có báo giá"
          description="Báo giá từ RFQ và đội sales ATTD sẽ hiển thị tại đây."
        />
      </div>
    </PortalBusinessGuard>
  );
}
