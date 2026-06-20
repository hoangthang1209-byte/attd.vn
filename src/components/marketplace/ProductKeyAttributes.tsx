import { formatPdpMoqValue, isPublicMoq } from "@/lib/formatMoq";

type ProductKeyAttributesProps = {
  className?: string;
  compact?: boolean;
  categoryName?: string;
  material?: string | null;
  form?: string | null;
  fit?: string | null;
  defaultMoq?: number | null;
  leadTime?: string | null;
  stockLabel?: string | null;
  stockColor?: string;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  colorSummary?: string;
  sizeSummary?: string;
};

export default function ProductKeyAttributes({
  className = "",
  compact = false,
  categoryName,
  material,
  form,
  fit,
  defaultMoq,
  leadTime,
  stockLabel,
  stockColor,
  supportsPrinting,
  supportsEmbroidery,
  supportsOem,
  colorSummary,
  sizeSummary,
}: ProductKeyAttributesProps) {
  const rows: { label: string; value: string; color?: string }[] = [];

  if (!compact && categoryName) rows.push({ label: "Danh mục", value: categoryName });
  if (material) rows.push({ label: "Chất liệu", value: material });
  if (form) rows.push({ label: "Form / kiểu dáng", value: form });
  if (!compact && fit) rows.push({ label: "Kiểu form", value: fit });
  if (isPublicMoq(defaultMoq)) {
    rows.push({ label: "Số lượng tối thiểu", value: formatPdpMoqValue(defaultMoq) });
  }
  if (leadTime) rows.push({ label: "Thời gian giao/sản xuất", value: leadTime });
  if (stockLabel) rows.push({ label: "Tình trạng hàng", value: stockLabel, color: stockColor });
  if (!compact && colorSummary) rows.push({ label: "Màu sắc", value: colorSummary });
  if (!compact && sizeSummary) rows.push({ label: "Size / Kích thước", value: sizeSummary });
  if (supportsPrinting) rows.push({ label: "Hỗ trợ in logo", value: "Có" });
  if (supportsEmbroidery) rows.push({ label: "Hỗ trợ thêu", value: "Có" });
  if (supportsOem) rows.push({ label: "Hỗ trợ OEM", value: "Có" });

  if (rows.length === 0) return null;

  return (
    <div className={`mp-pdp-key-attrs ${className}`.trim()}>
      <h2 className="mp-pdp-key-attrs-title">Thông tin nhanh</h2>
      <dl className="mp-pdp-key-attrs-grid">
        {rows.map((row) => (
          <div key={row.label} className="mp-pdp-key-attr">
            <dt>{row.label}</dt>
            <dd style={row.color ? { color: row.color } : undefined}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
