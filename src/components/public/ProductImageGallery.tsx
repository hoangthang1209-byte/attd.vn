"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import ImagePlaceholder from "@/components/public/ImagePlaceholder";

type GalleryImage = {
  id: string;
  imageUrl: string;
  altText: string | null;
};

type Props = {
  images: GalleryImage[];
  productName: string;
};

export default function ProductImageGallery({ images, productName }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mainOpacity, setMainOpacity] = useState(1);
  const [hoveredThumb, setHoveredThumb] = useState<number | null>(null);

  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = images.length;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function changeImage(index: number) {
    if (index === selectedIndex) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    setMainOpacity(0);
    timerRef.current = setTimeout(() => {
      setSelectedIndex(index);
      setMainOpacity(1);
    }, 130);

    thumbRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  if (total === 0) {
    return (
      <div className="product-gallery-main product-gallery-main--empty">
        <ImagePlaceholder variant="product" label={productName} />
      </div>
    );
  }

  const selected = images[selectedIndex] ?? images[0];

  return (
    <div>
      <div
        className="product-gallery-main"
        style={{ opacity: mainOpacity, transition: "opacity 0.13s ease" }}
      >
        <Image
          src={selected.imageUrl}
          alt={selected.altText ?? productName}
          fill
          style={{ objectFit: "cover" }}
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />

        {total > 1 && (
          <div className="product-gallery-counter" aria-hidden="true">
            {selectedIndex + 1} / {total}
          </div>
        )}
      </div>

      {total > 1 && (
        <div className="product-gallery-thumbs" role="list" aria-label="Xem ảnh sản phẩm">
          {images.map((image, index) => {
            const isSelected = index === selectedIndex;
            const isHovered = hoveredThumb === index && !isSelected;

            return (
              <button
                key={image.id}
                ref={(el) => {
                  thumbRefs.current[index] = el;
                }}
                role="listitem"
                onClick={() => changeImage(index)}
                onMouseEnter={() => setHoveredThumb(index)}
                onMouseLeave={() => setHoveredThumb(null)}
                aria-label={`Xem ảnh ${index + 1}`}
                aria-pressed={isSelected}
                className={`product-gallery-thumb${isSelected ? " product-gallery-thumb--active" : ""}`}
                style={{
                  opacity: isSelected ? 1 : isHovered ? 0.82 : 0.55,
                  transform: isHovered ? "scale(1.05)" : "scale(1)",
                }}
              >
                <Image
                  src={image.imageUrl}
                  alt={image.altText ?? `${productName} — ảnh ${index + 1}`}
                  fill
                  sizes="72px"
                  style={{ objectFit: "cover" }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
