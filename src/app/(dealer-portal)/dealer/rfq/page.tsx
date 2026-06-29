import Link from "next/link";

export default function DealerRfqPage() {
  return (
    <div className="dealer-portal-page">
      <header className="dealer-portal-header">
        <h1>Yêu cầu báo giá B2B</h1>
        <p className="dealer-portal-lead">Gửi RFQ cho đơn hàng sỉ, in ấn, thêu hoặc OEM.</p>
      </header>
      <section className="dealer-portal-card">
        <p>Module RFQ đại lý sẽ được triển khai trong Sprint D2/D3. Đây là route dành riêng cho quy trình B2B, không phải giỏ hàng B2C.</p>
        <Link href="/dealer" className="dealer-portal-btn">Về bảng điều khiển</Link>
      </section>
    </div>
  );
}
