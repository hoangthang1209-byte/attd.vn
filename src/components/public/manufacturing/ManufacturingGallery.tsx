import type { ManufacturingEvidenceItem } from "@/lib/manufacturing-library.types";
import ManufacturingGalleryTile from "@/components/public/manufacturing/ManufacturingGalleryTile";
import ManufacturingLibraryEmptyGuard from "@/components/public/manufacturing/ManufacturingLibraryEmptyGuard";

type Layout = "mosaic" | "inline";

type Props = {
  title?: string;
  items: readonly ManufacturingEvidenceItem[];
  layout?: Layout;
  className?: string;
  /** When false, only images render (e.g. tight PDP sidebar). */
  showTitle?: boolean;
};

export default function ManufacturingGallery({
  title,
  items,
  layout = "mosaic",
  className,
  showTitle = true,
}: Props) {
  return (
    <ManufacturingLibraryEmptyGuard items={items}>
      {(itemsWithMedia) => (
        <section
          className={[
            "manufacturing-gallery",
            layout === "inline" ? "manufacturing-gallery--inline" : "manufacturing-gallery--mosaic",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label={title ?? "Hình ảnh sản xuất"}
        >
          {showTitle && title ? (
            <h2 className="manufacturing-gallery__title">{title}</h2>
          ) : null}
          <div className="manufacturing-gallery__grid">
            {itemsWithMedia.map((item, index) => (
              <ManufacturingGalleryTile
                key={item.id}
                item={item}
                layout={layout}
                priority={index === 0}
              />
            ))}
          </div>
        </section>
      )}
    </ManufacturingLibraryEmptyGuard>
  );
}
