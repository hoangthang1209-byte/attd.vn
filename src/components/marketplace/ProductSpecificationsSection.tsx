import type { ProductSpecificationRow } from "@/features/products/product-detail.types";

type Props = {
  rows: ProductSpecificationRow[];
  preview?: boolean;
};

export default function ProductSpecificationsSection({ rows, preview = false }: Props) {
  const visible = rows.filter((row) => row.label.trim() && row.value.trim());
  if (!visible.length) return null;

  const list = preview ? visible.slice(0, 6) : visible;
  const Wrapper = preview ? "div" : "section";
  const wrapperProps = preview
    ? { className: "mp-pdp-spec-preview-card" }
    : { className: "mp-section mp-pdp-section", id: "mp-pdp-specs" };

  return (
    <Wrapper {...wrapperProps}>
      <div className={preview ? undefined : "container"}>
        <header className={preview ? "mp-pdp-spec-preview-head" : "mp-pdp-section-head"}>
          <h2 className={preview ? "mp-pdp-spec-preview-title" : "mp-pdp-section-title"}>
            {preview ? "Thông số nổi bật" : "Thông số sản phẩm"}
          </h2>
          {!preview && (
            <p className="mp-pdp-section-subtitle">
              Thông tin kỹ thuật và quy cách sản phẩm cho đối tác B2B.
            </p>
          )}
        </header>

        <div className={`mp-pdp-spec-table${preview ? " mp-pdp-spec-table--preview" : ""}`}>
          <dl className="mp-pdp-spec-grid">
            {list.map((row) => (
              <div key={row.id} className="mp-pdp-spec-row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {preview && visible.length > list.length && (
          <p className="mp-pdp-spec-more">
            <a href="#mp-pdp-specs">Xem đầy đủ thông số ↓</a>
          </p>
        )}
      </div>
    </Wrapper>
  );
}
