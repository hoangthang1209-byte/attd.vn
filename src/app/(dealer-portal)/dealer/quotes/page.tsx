import Link from "next/link";

export default function DealerQuotesPage() {
  return (
    <div className="dealer-portal-page">
      <header className="dealer-portal-header">
        <h1>Báo giá của đại lý</h1>
        <p className="dealer-portal-lead">Theo dõi báo giá B2B đã tạo và được ATTD phản hồi.</p>
      </header>
      <section className="dealer-portal-card">
        <p>Danh sách báo giá đại lý sẽ kết nối Quote Builder trong sprint tiếp theo. Không có thanh toán hay checkout tại đây.</p>
        <Link href="/dealer" className="dealer-portal-btn">Về bảng điều khiển</Link>
      </section>
    </div>
  );
}
