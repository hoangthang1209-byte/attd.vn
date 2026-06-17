type ProductSpecTableProps = {
  material?: string | null;
  form?: string | null;
  fit?: string | null;
  gsm?: number | null;
  defaultMoq?: number | null;
  leadTime?: string | null;
  useCases?: string[];
  targetCustomers?: string[];
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
};

export default function ProductSpecTable({
  material,
  form,
  fit,
  gsm,
  defaultMoq,
  leadTime,
  useCases = [],
  targetCustomers = [],
  supportsPrinting,
  supportsEmbroidery,
  supportsOem,
}: ProductSpecTableProps) {
  const rows: { label: string; value: string }[] = [];

  if (material) rows.push({ label: "Chất liệu", value: material });
  if (form) rows.push({ label: "Form/kiểu dáng", value: form });
  if (fit) rows.push({ label: "Kiểu form", value: fit });
  if (gsm) rows.push({ label: "GSM", value: `${gsm} gsm` });
  if (defaultMoq != null) rows.push({ label: "Số lượng tối thiểu", value: `${defaultMoq} cái` });
  if (leadTime) rows.push({ label: "Thời gian giao/sản xuất", value: leadTime });
  if (useCases.length) rows.push({ label: "Ứng dụng B2B", value: useCases.join(" · ") });
  if (targetCustomers.length) rows.push({ label: "Đối tượng phù hợp", value: targetCustomers.join(" · ") });

  const services: string[] = [];
  if (supportsPrinting) services.push("In logo");
  if (supportsEmbroidery) services.push("Thêu");
  if (supportsOem) services.push("OEM / Private Label");
  if (services.length) rows.push({ label: "Hỗ trợ in/thêu/OEM", value: services.join(" · ") });

  if (rows.length === 0) return null;

  return (
    <div className="mp-spec-table-wrap">
      <h2 className="mp-spec-table-title">Thông tin sản phẩm</h2>
      <dl className="mp-spec-table">
        {rows.map((row) => (
          <div key={row.label} className="mp-spec-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
