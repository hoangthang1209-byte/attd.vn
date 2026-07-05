import ManufacturingEvidenceGrid from "@/components/public/manufacturing/ManufacturingEvidenceGrid";
import { getManufacturingAssetsForDisplayLocation } from "@/lib/manufacturing/manufacturing.service";

type Props = {
  title?: string;
  description?: string;
  /** Manufacturing Library display location key — future content plugs in here. */
  locationKey?: string;
  limit?: number;
  className?: string;
};

/**
 * Manufacturing Library integration point for company/about surfaces.
 * Renders only when public manufacturing assets exist for the location.
 */
export default async function FactoryOverview({
  title = "Năng lực nhà máy & vận hành",
  description = "Hình ảnh thực tế từ kho, xưởng, QC và đóng gói khi đã được công bố trên Manufacturing Library.",
  locationKey = "company-about",
  limit = 6,
  className,
}: Props) {
  const items = await getManufacturingAssetsForDisplayLocation({
    locationKey,
    visibility: "PUBLIC",
    limit,
    requireMedia: true,
  });

  if (items.length === 0) return null;

  const classes = ["factory-overview", "mp-section", "mp-section--tight", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} aria-label={title}>
      <div className="container">
        <ManufacturingEvidenceGrid title={title} description={description} items={items} />
      </div>
    </section>
  );
}
