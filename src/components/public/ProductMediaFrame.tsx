"use client";

import { useState } from "react";
import Image from "next/image";
import ImagePlaceholder from "@/components/public/ImagePlaceholder";
import { getPublicMediaUrl } from "@/features/media/get-public-media-url";

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
 * Invalid or runtime-failing URLs fall back to ImagePlaceholder (no broken <img>).
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
  const resolvedPrimary = getPublicMediaUrl(imageUrl);
  const resolvedHover = getPublicMediaUrl(hoverImageUrl);
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [hoverFailed, setHoverFailed] = useState(false);

  const hasImage = Boolean(resolvedPrimary) && !primaryFailed;
  const hasHover =
    hasImage &&
    Boolean(resolvedHover) &&
    !hoverFailed &&
    resolvedHover !== resolvedPrimary;

  return (
    <div
      className={`product-media-frame${hasHover ? " product-media-frame--has-hover" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      {hasImage && resolvedPrimary ? (
        <>
          <Image
            src={resolvedPrimary}
            alt={alt}
            fill
            className="product-media-frame__img product-media-frame__img--primary"
            sizes={sizes}
            priority={priority}
            onError={() => setPrimaryFailed(true)}
          />
          {hasHover && resolvedHover ? (
            <Image
              src={resolvedHover}
              alt=""
              fill
              aria-hidden="true"
              className="product-media-frame__img product-media-frame__img--hover"
              sizes={sizes}
              onError={() => setHoverFailed(true)}
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
