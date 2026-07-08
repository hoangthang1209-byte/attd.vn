import ManufacturingGallery from "@/components/public/manufacturing/ManufacturingGallery";
import { getManufacturingAssetsForDisplayLocation } from "@/lib/manufacturing/manufacturing.service";

type SectionProps = {
  title?: string;
  /** @deprecated Not shown in gallery layout. */
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
  title = "Góc nhìn từ xưởng",
  limit = 6,
  className,
}: SectionProps) {
  const items = await getItems("homepage", limit);
  if (items.length === 0) return null;

  return (
    <section
      className={["mp-section", "mp-section--tight", className].filter(Boolean).join(" ")}
      aria-label={title}
    >
      <div className="container">
        <ManufacturingGallery title={title} items={items} layout="mosaic" />
      </div>
    </section>
  );
}

export async function ManufacturingContactSection({
  title = "Hình ảnh thực tế",
  limit = 3,
  className,
}: SectionProps) {
  const items = await getItems("contact", limit);
  return (
    <ManufacturingGallery title={title} items={items} layout="inline" className={className} />
  );
}

export async function ManufacturingRfqSection({
  title = "Quy trình sản xuất",
  limit = 3,
  className,
}: SectionProps) {
  const items = await getItems("rfq", limit);
  return (
    <ManufacturingGallery title={title} items={items} layout="inline" className={className} />
  );
}
