import Link from "next/link";

type MarketplaceFinalCtaProps = {
  title?: string;
  description?: string;
  trustItems?: string[];
};

export default function MarketplaceFinalCta({
  title = "Bạn cần nguồn hàng đồng phục hoặc quà tặng doanh nghiệp?",
  description = "Gửi nhu cầu, ATTD sẽ tư vấn danh mục phù hợp, số lượng tối thiểu, thời gian giao/sản xuất và báo giá theo số lượng.",
  trustItems = ["Tư vấn nhanh", "Báo giá theo số lượng", "Bảo mật thông tin", "Không spam"],
}: MarketplaceFinalCtaProps) {
  return (
    <section className="mp-final-cta">
      <div className="container">
        <div className="mp-final-cta-inner">
          <p className="mp-final-cta-eyebrow">Sẵn sàng trao đổi nguồn hàng?</p>
          <h2 className="mp-final-cta-title">{title}</h2>
          <p className="mp-final-cta-desc">{description}</p>
          <div className="mp-final-cta-btns">
            <Link href="/lien-he" className="btn-primary">
              Liên hệ báo giá sỉ
            </Link>
            <Link href="/dai-ly" className="btn-secondary">
              Đăng ký đại lý
            </Link>
            <Link href="/san-pham" className="btn-tertiary mp-final-cta-tertiary">
              Xem danh mục sản phẩm
            </Link>
          </div>
          <div className="mp-final-cta-trust" aria-label="Cam kết tư vấn">
            {trustItems.map((item) => (
              <span key={item} className="mp-final-cta-trust-item">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
