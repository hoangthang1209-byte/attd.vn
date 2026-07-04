import type { ManufacturingEvidenceItem } from "@/lib/manufacturing-library.types";
import ManufacturingEvidenceCard from "@/components/public/manufacturing/ManufacturingEvidenceCard";
import ManufacturingLibraryEmptyGuard from "@/components/public/manufacturing/ManufacturingLibraryEmptyGuard";

type Props = {
  title?: string;
  items: readonly ManufacturingEvidenceItem[];
  className?: string;
};

export default function ManufacturingEvidenceStrip({ title, items, className }: Props) {
  return (
    <ManufacturingLibraryEmptyGuard items={items}>
      {(itemsWithMedia) => (
        <section
          className={["manufacturing-evidence-strip", className].filter(Boolean).join(" ")}
          aria-label={title ?? "Minh chứng quy trình"}
        >
          {title ? <h3 className="manufacturing-evidence-strip__title">{title}</h3> : null}
          <div className="manufacturing-evidence-strip__items">
            {itemsWithMedia.map((item) => (
              <ManufacturingEvidenceCard key={item.id} item={item} compact />
            ))}
          </div>
        </section>
      )}
    </ManufacturingLibraryEmptyGuard>
  );
}
