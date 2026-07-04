import type { ManufacturingEvidenceItem } from "@/lib/manufacturing-library.types";
import ManufacturingEvidenceCard from "@/components/public/manufacturing/ManufacturingEvidenceCard";
import ManufacturingLibraryEmptyGuard from "@/components/public/manufacturing/ManufacturingLibraryEmptyGuard";

type Props = {
  title?: string;
  description?: string;
  items: readonly ManufacturingEvidenceItem[];
  className?: string;
};

export default function ManufacturingEvidenceGrid({
  title,
  description,
  items,
  className,
}: Props) {
  return (
    <ManufacturingLibraryEmptyGuard items={items}>
      {(itemsWithMedia) => (
        <section
          className={["manufacturing-evidence-grid", className].filter(Boolean).join(" ")}
          aria-label={title ?? "Minh chứng năng lực sản xuất"}
        >
          {title ? <h3 className="manufacturing-evidence-grid__title">{title}</h3> : null}
          {description ? (
            <p className="manufacturing-evidence-grid__desc">{description}</p>
          ) : null}
          <div className="manufacturing-evidence-grid__items">
            {itemsWithMedia.map((item) => (
              <ManufacturingEvidenceCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </ManufacturingLibraryEmptyGuard>
  );
}
