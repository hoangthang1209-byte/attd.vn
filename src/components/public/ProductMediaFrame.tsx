import Image from "next/image";
import ImagePlaceholder from "@/components/public/ImagePlaceholder";
import { isValidImageSrc } from "@/lib/imagePaths";

type ProductMediaFrameProps = {
  imageUrl?: string | null;
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
  alt,
  placeholderLabel,
  sizes,
  priority = false,
  className = "",
  placeholderCompact = false,
}: ProductMediaFrameProps) {
  const hasImage = imageUrl && isValidImageSrc(imageUrl);

  return (
    <div className={`product-media-frame${className ? ` ${className}` : ""}`}>
      {hasImage ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="product-media-frame__img"
          sizes={sizes}
          priority={priority}
        />
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
