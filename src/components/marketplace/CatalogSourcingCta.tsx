import Link from "next/link";

type Props = {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function CatalogSourcingCta({
  title = "Chưa thấy mẫu phù hợp?",
  description = "Gửi số lượng, chất liệu và thời gian cần hàng — ATTD tư vấn nguồn hàng thay thế, MOQ và báo giá B2B.",
  primaryHref = "/lien-he",
  primaryLabel = "Tư vấn nguồn hàng",
  secondaryHref = "/san-pham",
  secondaryLabel = "Xem toàn bộ sản phẩm",
}: Props) {
  return (
    <section className="mp-catalog-sourcing-cta" aria-labelledby="catalog-sourcing-cta-title">
      <div className="mp-catalog-sourcing-cta__card">
        <div className="mp-catalog-sourcing-cta__copy">
          <p className="mp-catalog-results-kicker">Nguồn hàng B2B</p>
          <h2 id="catalog-sourcing-cta-title" className="mp-catalog-sourcing-cta__title">
            {title}
          </h2>
          <p className="mp-catalog-sourcing-cta__desc">{description}</p>
        </div>
        <div className="mp-catalog-sourcing-cta__actions">
          <Link href={primaryHref} className="btn-primary">
            {primaryLabel}
          </Link>
          <Link href={secondaryHref} className="btn-secondary">
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
