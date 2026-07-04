import type { ManufacturingEvidenceItem } from "@/lib/manufacturing-library.types";
import { isValidImageSrc } from "@/lib/imagePaths";
import { hasManufacturingEvidenceMedia } from "@/components/public/manufacturing/ManufacturingLibraryEmptyGuard";

type Props = {
  item: ManufacturingEvidenceItem;
  compact?: boolean;
};

export default function ManufacturingEvidenceCard({ item, compact = false }: Props) {
  if (!hasManufacturingEvidenceMedia(item)) return null;

  const imageUrl = item.imageUrl && isValidImageSrc(item.imageUrl) ? item.imageUrl : null;
  const videoUrl = !imageUrl ? item.videoUrl : null;

  return (
    <article
      className={[
        "manufacturing-evidence-card",
        compact ? "manufacturing-evidence-card--compact" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="manufacturing-evidence-card__media">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.alt}
            className="manufacturing-evidence-card__image"
            loading="lazy"
          />
        ) : null}
        {videoUrl ? (
          <video
            src={videoUrl}
            className="manufacturing-evidence-card__video"
            controls
            preload="metadata"
            aria-label={item.alt}
          />
        ) : null}
      </div>
      <div className="manufacturing-evidence-card__body">
        <p className="manufacturing-evidence-card__title">{item.title}</p>
        {!compact ? (
          <p className="manufacturing-evidence-card__desc">{item.description}</p>
        ) : null}
      </div>
    </article>
  );
}
