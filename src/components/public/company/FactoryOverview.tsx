import ManufacturingEvidenceGrid from "@/components/public/manufacturing/ManufacturingEvidenceGrid";
import { getManufacturingAssetsForDisplayLocation } from "@/lib/manufacturing/manufacturing.service";
import type { ManufacturingFrontendAsset } from "@/lib/manufacturing/manufacturing.types";

type Props = {
  title?: string;
  description?: string;
  /** Manufacturing Library display location key — future content plugs in here. */
  locationKey?: string;
  limit?: number;
  className?: string;
};

const OPERATIONAL_CATEGORIES = new Set([
  "warehouse",
  "production",
  "cutting",
  "sewing",
  "printing",
  "embroidery",
  "qc",
  "packing",
  "delivery",
  "material-sample",
  "material-samples",
  "real-order",
  "real-orders",
]);

function filterOperationalAssets(items: ManufacturingFrontendAsset[]): ManufacturingFrontendAsset[] {
  return items.filter((item) => OPERATIONAL_CATEGORIES.has(item.category));
}

/**
 * Manufacturing Library integration point for company/about surfaces.
 * Renders only when public manufacturing assets exist for the location.
 */
export default async function FactoryOverview({
  title = "Quy trình sản xuất tại ATTD",
  description = "Hình ảnh thực tế từ kho, xưởng, QC và đóng gói khi đã được phân loại vận hành.",
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

  const operationalItems = filterOperationalAssets(items);
  if (operationalItems.length === 0) return null;

  const classes = ["factory-overview", "mp-section", "mp-section--tight", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} aria-label={title}>
      <div className="container">
        <ManufacturingEvidenceGrid title={title} description={description} items={operationalItems} />
      </div>
    </section>
  );
}
