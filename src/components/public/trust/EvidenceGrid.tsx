import type { EvidenceItem } from "@/lib/b2b-trust-v2.types";
import EvidenceCard from "@/components/public/trust/EvidenceCard";
import { isValidImageSrc } from "@/lib/imagePaths";

type Props = {
  title?: string;
  description?: string;
  items: readonly EvidenceItem[];
  className?: string;
};

export default function EvidenceGrid({ title, description, items, className }: Props) {
  const visibleItems = items.filter((item) => item.imageUrl && isValidImageSrc(item.imageUrl));
  if (visibleItems.length === 0) return null;

  return (
    <section
      className={["trust-evidence-grid", className].filter(Boolean).join(" ")}
      aria-label={title ?? "Minh chứng năng lực"}
    >
      {title ? <h3 className="trust-evidence-grid__title">{title}</h3> : null}
      {description ? <p className="trust-evidence-grid__desc">{description}</p> : null}
      <div className="trust-evidence-grid__items">
        {visibleItems.map((item) => (
          <EvidenceCard key={`${item.category}-${item.title}`} item={item} />
        ))}
      </div>
    </section>
  );
}
