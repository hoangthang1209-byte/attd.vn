import Link from "next/link";

type MarketplaceFinalCtaProps = {
  title?: string;
  description?: string;
  trustItems?: string[];
  secondaryContactHref?: string;
  secondaryContactLabel?: string;
};

export default function MarketplaceFinalCta({
  title = "Bạn cần nguồn hàng đồng phục hoặc quà tặng doanh nghiệp?",
  description = "Gửi yêu cầu để ATTD tư vấn cấu hình phù hợp, số lượng tối thiểu và tiến độ triển khai rõ ràng.",
  trustItems = [],
  secondaryContactHref,
  secondaryContactLabel,
}: MarketplaceFinalCtaProps) {
  const showSecondaryContact = Boolean(secondaryContactHref && secondaryContactLabel);

  return (
    <section className="mp-final-cta">
      <div className="container">
        <div className="mp-final-cta-inner">
          <p className="mp-final-cta-eyebrow">Sẵn sàng trao đổi nguồn hàng?</p>
          <h2 className="mp-final-cta-title">{title}</h2>
          <p className="mp-final-cta-desc">{description}</p>
          <div className="mp-final-cta-btns">
            <Link href="/lien-he" className="btn-primary">
              Yêu cầu báo giá
            </Link>
            {showSecondaryContact ? (
              <Link href={secondaryContactHref!} className="btn-secondary">
                {secondaryContactLabel}
              </Link>
            ) : null}
          </div>
          {trustItems.length > 0 ? (
            <div className="mp-final-cta-trust" aria-label="Cam kết tư vấn">
              {trustItems.map((item) => (
                <span key={item} className="mp-final-cta-trust-item">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
