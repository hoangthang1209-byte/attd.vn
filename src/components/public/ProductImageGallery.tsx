"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import ProductMediaFrame from "@/components/public/ProductMediaFrame";
import {
  getProductGalleryImages,
  type ProductImageRecord,
} from "@/lib/productImages";
import { isValidImageSrc } from "@/lib/imagePaths";

type Props = {
  images: ProductImageRecord[];
  productName: string;
};

export default function ProductImageGallery({ images, productName }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mainOpacity, setMainOpacity] = useState(1);
  const [hoveredThumb, setHoveredThumb] = useState<number | null>(null);

  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gallery = getProductGalleryImages(images);
  const total = gallery.length;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedIndex >= total && total > 0) {
      setSelectedIndex(0);
    }
  }, [selectedIndex, total]);

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
        <ProductMediaFrame
          alt={productName}
          placeholderLabel={productName}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
    );
  }

  const selected = gallery[selectedIndex] ?? gallery[0];
  const selectedSrc = selected?.imageUrl;

  if (!selectedSrc || !isValidImageSrc(selectedSrc)) {
    return (
      <div className="product-gallery-main product-gallery-main--empty">
        <ProductMediaFrame
          alt={productName}
          placeholderLabel={productName}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
    );
  }

  const mainAlt =
    total > 1
      ? `${productName} — ảnh ${selectedIndex + 1}`
      : productName;

  return (
    <div>
      <div
        className="product-gallery-main"
        style={{ opacity: mainOpacity, transition: "opacity 0.13s ease" }}
      >
        <Image
          src={selectedSrc}
          alt={selected.altText ?? mainAlt}
          fill
          className="product-gallery-main-img"
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
        <div
          className="product-gallery-thumbs"
          role="list"
          aria-label="Xem ảnh sản phẩm"
        >
          {gallery.map((image, index) => {
            if (!isValidImageSrc(image.imageUrl)) return null;

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
                  className="product-gallery-thumb-img"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
