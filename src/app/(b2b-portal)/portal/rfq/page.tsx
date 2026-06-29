import Link from "next/link";
import PortalBusinessGuard from "@/components/portal/PortalBusinessGuard";

export default function PortalRfqPage() {
  return (
    <PortalBusinessGuard>
      <div className="portal-page">
        <p className="portal-eyebrow">RFQ</p>
        <h1 className="portal-title">Gửi yêu cầu báo giá B2B</h1>
        <p className="portal-lead">
          Gửi RFQ với mô tả sản phẩm tự do, số lượng, deadline, ngân sách mục tiêu và file artwork.
          Tính năng gửi RFQ sẽ mở trong Sprint D3.
        </p>
        <div className="portal-card">
          <h2>Chuẩn bị thông tin</h2>
          <ul style={{ margin: "12px 0 0", paddingLeft: 20, fontSize: 14, color: "#525252", lineHeight: 1.7 }}>
            <li>Loại sản phẩm / dịch vụ</li>
            <li>Số lượng và MOQ mong muốn</li>
            <li>Thời hạn cần báo giá</li>
            <li>Ngân sách mục tiêu (nếu có)</li>
            <li>File thiết kế / tech pack</li>
          </ul>
        </div>
        <div style={{ marginTop: 20 }}>
          <button type="button" className="portal-btn portal-btn--primary portal-btn--disabled" disabled>
            Gửi RFQ — sắp ra mắt
          </button>
          <Link href="/portal" className="portal-btn" style={{ marginLeft: 8 }}>
            Về workspace
          </Link>
        </div>
      </div>
    </PortalBusinessGuard>
  );
}
