import Link from "next/link";

export default function DealerResourcesPage() {
  return (
    <div className="dealer-portal-page">
      <header className="dealer-portal-header">
        <h1>Tài nguyên đại lý</h1>
        <p className="dealer-portal-lead">Catalog, chính sách giá, tech pack và tài liệu hỗ trợ bán hàng B2B.</p>
      </header>
      <section className="dealer-portal-card">
        <p>Khu vực tài nguyên sẽ tích hợp Knowledge Base (phạm vi DEALER_PORTAL), Pattern Library và Tech Pack trong các sprint tiếp theo.</p>
        <div className="dealer-portal-actions">
          <Link href="/san-pham" className="dealer-portal-btn">Xem danh mục sản phẩm</Link>
          <Link href="/dealer" className="dealer-portal-btn dealer-portal-btn--primary">Về bảng điều khiển</Link>
        </div>
      </section>
    </div>
  );
}
