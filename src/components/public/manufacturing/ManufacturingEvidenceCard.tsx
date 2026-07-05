import Image from "next/image";
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
  const hasVideo = Boolean(item.videoUrl);
  const mediaAlt = item.alt?.trim() || item.title;
  const categoryLabel = item.categoryName || item.category.replace(/-/g, " ");

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
          <Image
            src={imageUrl}
            alt={mediaAlt}
            className="manufacturing-evidence-card__image"
            fill
            loading="lazy"
            sizes={compact ? "84px" : "(max-width: 639px) 100vw, 33vw"}
          />
        ) : null}
        {videoUrl ? (
          <video
            src={videoUrl}
            className="manufacturing-evidence-card__video"
            controls
            preload="metadata"
            poster={item.videoPosterUrl}
            aria-label={mediaAlt}
          />
        ) : null}
        {hasVideo ? (
          <span className="manufacturing-evidence-card__video-badge">Video</span>
        ) : null}
      </div>
      <div className="manufacturing-evidence-card__body">
        <div className="manufacturing-evidence-card__meta">
          <span className="manufacturing-evidence-card__category">{categoryLabel}</span>
          {item.featured ? (
            <span className="manufacturing-evidence-card__featured">Nổi bật</span>
          ) : null}
        </div>
        <p className="manufacturing-evidence-card__title">{item.title}</p>
        {!compact ? (
          <p className="manufacturing-evidence-card__desc">{item.description}</p>
        ) : null}
      </div>
    </article>
  );
}
