import ManufacturingEvidenceGrid from "@/components/public/manufacturing/ManufacturingEvidenceGrid";
import ManufacturingEvidenceStrip from "@/components/public/manufacturing/ManufacturingEvidenceStrip";
import { getManufacturingAssetsForDisplayLocation } from "@/lib/manufacturing/manufacturing.service";

type SectionProps = {
  title?: string;
  description?: string;
  limit?: number;
  className?: string;
};

async function getItems(locationKey: string, limit: number) {
  return getManufacturingAssetsForDisplayLocation({
    locationKey,
    visibility: "PUBLIC",
    limit,
    requireMedia: true,
  });
}

export async function ManufacturingHomepageSection({
  title = "Năng lực sản xuất thực tế",
  description = "Hình ảnh từ kho, xưởng, QC và đóng gói của ATTD.",
  limit = 3,
  className,
}: SectionProps) {
  const items = await getItems("homepage", limit);
  return (
    <ManufacturingEvidenceGrid
      title={title}
      description={description}
      items={items}
      className={className}
    />
  );
}

export async function ManufacturingContactSection({
  title = "Minh chứng vận hành",
  limit = 3,
  className,
}: SectionProps) {
  const items = await getItems("contact", limit);
  return <ManufacturingEvidenceStrip title={title} items={items} className={className} />;
}

export async function ManufacturingRfqSection({
  title = "Minh chứng quy trình",
  limit = 3,
  className,
}: SectionProps) {
  const items = await getItems("rfq", limit);
  return <ManufacturingEvidenceStrip title={title} items={items} className={className} />;
}
