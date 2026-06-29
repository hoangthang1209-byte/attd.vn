import Link from "next/link";

export default function DealerLoginPage() {
  return (
    <div className="dealer-portal-page dealer-portal-page--narrow">
      <header className="dealer-portal-header">
        <h1>Đăng nhập đại lý</h1>
        <p className="dealer-portal-lead">Truy cập khu vực làm việc B2B của ATTD.</p>
      </header>
      <section className="dealer-portal-card">
        <p>
          Đăng nhập đại lý sẽ được kích hoạt trong sprint tiếp theo. Hiện tại, đội ngũ ATTD có thể tạo và duyệt hồ sơ đại lý trong quản trị.
        </p>
        <div className="dealer-portal-actions">
          <Link href="/dealer" className="dealer-portal-btn">
            Quay lại cổng đại lý
          </Link>
          <Link href="/dai-ly" className="dealer-portal-btn dealer-portal-btn--primary">
            Đăng ký đại lý
          </Link>
        </div>
      </section>
    </div>
  );
}
