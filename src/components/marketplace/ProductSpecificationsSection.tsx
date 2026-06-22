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
    ? { className: "mp-pdp-spec-preview" }
    : { className: "mp-section mp-section--compact", id: "mp-pdp-specs" };

  return (
    <Wrapper {...wrapperProps}>
      <div className={preview ? undefined : "container"}>
        <h2 className={preview ? "mp-pdp-spec-preview-title" : "mp-section-title"}>
          {preview ? "Thông số nổi bật" : "Thông số sản phẩm"}
        </h2>
        <dl className="mp-pdp-spec-grid">
          {list.map((row) => (
            <div key={row.id} className="mp-pdp-spec-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        {preview && visible.length > list.length && (
          <p className="mp-pdp-spec-more">
            <a href="#mp-pdp-specs">Xem đầy đủ thông số</a>
          </p>
        )}
      </div>
    </Wrapper>
  );
}
