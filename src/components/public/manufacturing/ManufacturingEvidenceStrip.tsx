import type { ManufacturingEvidenceItem } from "@/lib/manufacturing-library.types";
import ManufacturingGallery from "@/components/public/manufacturing/ManufacturingGallery";

type Props = {
  title?: string;
  items: readonly ManufacturingEvidenceItem[];
  className?: string;
  showTitle?: boolean;
};

export default function ManufacturingEvidenceStrip({
  title,
  items,
  className,
  showTitle = true,
}: Props) {
  return (
    <ManufacturingGallery
      title={title}
      items={items}
      layout="inline"
      className={className}
      showTitle={showTitle}
    />
  );
}
