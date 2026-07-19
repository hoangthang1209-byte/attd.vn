import type { ProductSpecificationRow } from "@/features/products/product-detail.types";

type Props = {
  rows: ProductSpecificationRow[];
  preview?: boolean;
};

export default function ProductSpecificationsSection({ rows, preview = false }: Props) {
  const visible = rows.filter((row) => row.label.trim() && row.value.trim());
  if (!visible.length) return null;

  const list = preview ? selectPreviewRows(visible) : visible;
  const Wrapper = preview ? "div" : "section";
  const wrapperProps = preview
    ? { className: "mp-pdp-spec-preview-card" }
    : { className: "mp-section mp-pdp-section", id: "mp-pdp-specs" };

  return (
    <Wrapper {...wrapperProps}>
      <header className={preview ? "mp-pdp-spec-preview-head" : "mp-pdp-section-head"}>
        <h2 className={preview ? "mp-pdp-spec-preview-title" : "mp-pdp-section-title"}>
          {preview ? "Tóm tắt kỹ thuật" : "Thông số sản phẩm"}
        </h2>
        {!preview && (
          <p className="mp-pdp-section-subtitle">
            Thông tin kỹ thuật và quy cách sản phẩm cho đối tác B2B.
          </p>
        )}
      </header>

      {preview ? (
        <dl className="mp-pdp-spec-preview-grid">
          {list.map((row) => (
            <div key={row.id} className="mp-pdp-spec-preview-grid-item">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="mp-pdp-spec-table">
          <dl className="mp-pdp-spec-grid">
            {list.map((row) => (
              <div key={row.id} className="mp-pdp-spec-row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {preview && (
        <p className="mp-pdp-spec-more">
          <a href="#mp-pdp-specs">Xem đầy đủ thông số</a>
        </p>
      )}
    </Wrapper>
  );
}

function selectPreviewRows(rows: ProductSpecificationRow[]) {
  const lowerPriorityLabels = [/chất liệu/i, /form/i, /kiểu dáng/i];
  const prioritized = rows.filter(
    (row) => !lowerPriorityLabels.some((pattern) => pattern.test(row.label)),
  );
  const source = prioritized.length >= 2 ? prioritized : rows;
  return source.slice(0, 4);
}
