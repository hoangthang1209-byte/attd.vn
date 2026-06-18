type ProductHighlightsProps = {
  shortDescription?: string | null;
  description?: string | null;
  material?: string | null;
  form?: string | null;
  defaultMoq?: number | null;
  leadTime?: string | null;
  useCases?: string[];
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
};

function buildBullets(props: ProductHighlightsProps): string[] {
  const bullets: string[] = [];

  if (props.shortDescription) {
    const parts = props.shortDescription
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 12);
    bullets.push(...parts.slice(0, 2));
  }

  if (props.material) bullets.push(`Chất liệu: ${props.material}`);
  if (props.form) bullets.push(`Form / kiểu dáng: ${props.form}`);
  if (props.defaultMoq != null) {
    bullets.push(`Số lượng tối thiểu từ ${props.defaultMoq} cái`);
  }
  if (props.leadTime) bullets.push(`Thời gian giao/sản xuất: ${props.leadTime}`);

  const services: string[] = [];
  if (props.supportsPrinting) services.push("in logo");
  if (props.supportsEmbroidery) services.push("thêu");
  if (props.supportsOem) services.push("OEM/private label");
  if (services.length) bullets.push(`Hỗ trợ ${services.join(", ")}`);

  for (const useCase of props.useCases ?? []) {
    if (bullets.length >= 6) break;
    if (!bullets.includes(useCase)) bullets.push(useCase);
  }

  return [...new Set(bullets)].slice(0, 6);
}

export default function ProductHighlights(props: ProductHighlightsProps) {
  const bullets = buildBullets(props);
  if (bullets.length === 0) return null;

  return (
    <div className="mp-pdp-highlights">
      <h2 className="mp-pdp-highlights-title">Điểm nổi bật</h2>
      <ul className="mp-pdp-highlights-list">
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
