import Image from "next/image";
import type { ManufacturingEvidenceItem } from "@/lib/manufacturing-library.types";
import { isValidImageSrc } from "@/lib/imagePaths";
import { getManufacturingActivityCaption } from "@/lib/manufacturing/manufacturing-caption";

type Props = {
  item: ManufacturingEvidenceItem;
  layout?: "mosaic" | "inline";
  priority?: boolean;
};

export default function ManufacturingGalleryTile({
  item,
  layout = "mosaic",
  priority = false,
}: Props) {
  const imageUrl = item.imageUrl && isValidImageSrc(item.imageUrl) ? item.imageUrl : null;
  if (!imageUrl) return null;

  const caption = getManufacturingActivityCaption(item);
  const alt = item.alt?.trim() || caption;

  return (
    <figure
      className={[
        "manufacturing-gallery__tile",
        layout === "inline" ? "manufacturing-gallery__tile--inline" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="manufacturing-gallery__media">
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="manufacturing-gallery__image"
          sizes={
            layout === "inline"
              ? "120px"
              : "(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 320px"
          }
          priority={priority}
          loading={priority ? undefined : "lazy"}
        />
      </div>
      <figcaption className="manufacturing-gallery__caption">{caption}</figcaption>
    </figure>
  );
}
