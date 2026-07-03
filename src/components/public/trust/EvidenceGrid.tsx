import type { EvidenceItem } from "@/lib/b2b-trust-v2.types";
import EvidenceCard from "@/components/public/trust/EvidenceCard";

type Props = {
  title?: string;
  description?: string;
  items: readonly EvidenceItem[];
  className?: string;
};

export default function EvidenceGrid({ title, description, items, className }: Props) {
  if (items.length === 0) return null;

  const hasMissingImages = items.some((item) => !item.imageUrl);

  return (
    <section
      className={["trust-evidence-grid", className].filter(Boolean).join(" ")}
      aria-label={title ?? "Minh chứng năng lực"}
    >
      {title ? <h3 className="trust-evidence-grid__title">{title}</h3> : null}
      {description ? <p className="trust-evidence-grid__desc">{description}</p> : null}
      <div className="trust-evidence-grid__items">
        {items.map((item) => (
          <EvidenceCard key={`${item.category}-${item.title}`} item={item} />
        ))}
      </div>
      {hasMissingImages ? (
        <p className="trust-evidence-grid__footnote">
          ATTD sẽ bổ sung hình ảnh kho, sản xuất và QC từ dữ liệu thực tế.
        </p>
      ) : null}
    </section>
  );
}
