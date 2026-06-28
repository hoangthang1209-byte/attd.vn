import Image from "next/image";
import ImagePlaceholder from "@/components/public/ImagePlaceholder";
import { isValidImageSrc } from "@/lib/imagePaths";

type ProductMediaFrameProps = {
  imageUrl?: string | null;
  hoverImageUrl?: string | null;
  alt: string;
  placeholderLabel?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  placeholderCompact?: boolean;
};

/**
 * Square 1:1 public product media canvas — object-fit contain, neutral surface.
 * Used on product cards and anywhere a consistent marketplace product frame is needed.
 */
export default function ProductMediaFrame({
  imageUrl,
  hoverImageUrl,
  alt,
  placeholderLabel,
  sizes,
  priority = false,
  className = "",
  placeholderCompact = false,
}: ProductMediaFrameProps) {
  const hasImage = imageUrl && isValidImageSrc(imageUrl);
  const hasHover =
    hasImage &&
    hoverImageUrl &&
    isValidImageSrc(hoverImageUrl) &&
    hoverImageUrl.trim() !== imageUrl.trim();

  return (
    <div
      className={`product-media-frame${hasHover ? " product-media-frame--has-hover" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      {hasImage ? (
        <>
          <Image
            src={imageUrl}
            alt={alt}
            fill
            className="product-media-frame__img product-media-frame__img--primary"
            sizes={sizes}
            priority={priority}
          />
          {hasHover ? (
            <Image
              src={hoverImageUrl}
              alt=""
              fill
              aria-hidden="true"
              className="product-media-frame__img product-media-frame__img--hover"
              sizes={sizes}
            />
          ) : null}
        </>
      ) : (
        <ImagePlaceholder
          variant="product"
          label={placeholderLabel}
          compact={placeholderCompact}
        />
      )}
    </div>
  );
}
