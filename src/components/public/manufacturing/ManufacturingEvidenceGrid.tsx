import type { ManufacturingEvidenceItem } from "@/lib/manufacturing-library.types";
import ManufacturingGallery from "@/components/public/manufacturing/ManufacturingGallery";

type Props = {
  title?: string;
  /** @deprecated Gallery is image-first; descriptions are not rendered. */
  description?: string;
  items: readonly ManufacturingEvidenceItem[];
  className?: string;
};

export default function ManufacturingEvidenceGrid({
  title,
  items,
  className,
}: Props) {
  return (
    <ManufacturingGallery
      title={title}
      items={items}
      layout="mosaic"
      className={className}
    />
  );
}
