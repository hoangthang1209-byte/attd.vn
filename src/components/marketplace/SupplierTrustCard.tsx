import Link from "next/link";

export default function SupplierTrustCard() {
  return (
    <div className="mp-supplier-card">
      <p className="mp-supplier-card-kicker">Nguồn cung cấp bởi ATTD</p>
      <h3 className="mp-supplier-card-title">
        ATTD — Kho sỉ đồng phục &amp; quà tặng doanh nghiệp
      </h3>
      <p className="mp-supplier-card-desc">
        Nguồn hàng cho đại lý, agency, xưởng in/thêu và doanh nghiệp mua số lượng lớn.
      </p>
      <ul className="mp-supplier-card-facts">
        <li>Nền tảng sourcing B2B</li>
        <li>Hỗ trợ in/thêu/OEM</li>
        <li>Giao hàng toàn quốc</li>
        <li>Tư vấn theo số lượng</li>
      </ul>
      <Link href="/lien-he" className="mp-supplier-card-link">
        Liên hệ báo giá sỉ
      </Link>
    </div>
  );
}
