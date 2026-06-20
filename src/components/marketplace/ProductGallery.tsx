"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import ProductMediaFrame from "@/components/public/ProductMediaFrame";
import {
  getProductGalleryImages,
  type ProductImageRecord,
} from "@/lib/productImages";
import { isValidImageSrc } from "@/lib/imagePaths";

type Props = {
  images: ProductImageRecord[];
  productName: string;
  selectedImageUrl?: string | null;
};

export default function ProductGallery({ images, productName, selectedImageUrl }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const gallery = getProductGalleryImages(images);
  const total = gallery.length;
  const galleryKey = gallery.map((img) => img.imageUrl).join("|");

  useEffect(() => {
    if (selectedIndex >= total && total > 0) setSelectedIndex(0);
  }, [selectedIndex, total]);

  useEffect(() => {
    if (total === 0) return;

    if (selectedImageUrl && isValidImageSrc(selectedImageUrl)) {
      const idx = gallery.findIndex((img) => img.imageUrl === selectedImageUrl);
      setSelectedIndex(idx >= 0 ? idx : 0);
      return;
    }

    setSelectedIndex(0);
  }, [selectedImageUrl, galleryKey, total, gallery]);

  function goTo(index: number) {
    if (total === 0) return;
    const next = (index + total) % total;
    setSelectedIndex(next);
    thumbRefs.current[next]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  if (total === 0) {
    return (
      <div className="mp-pdp-gallery mp-pdp-gallery--empty">
        <ProductMediaFrame
          alt={productName}
          placeholderLabel={productName}
          sizes="(max-width: 1024px) 100vw, 44vw"
        />
      </div>
    );
  }

  const selected = gallery[selectedIndex] ?? gallery[0];
  const selectedSrc = selected?.imageUrl;
  const mainAlt =
    total > 1
      ? `${productName} — ảnh ${selectedIndex + 1}`
      : productName;

  if (!selectedSrc || !isValidImageSrc(selectedSrc)) {
    return (
      <div className="mp-pdp-gallery mp-pdp-gallery--empty">
        <ProductMediaFrame
          alt={productName}
          placeholderLabel={productName}
          sizes="(max-width: 1024px) 100vw, 44vw"
        />
      </div>
    );
  }

  return (
    <>
      <div className="mp-pdp-gallery">
        {total > 1 && (
          <div className="mp-pdp-gallery-thumbs mp-pdp-gallery-thumbs--vertical" role="list">
            {gallery.map((image, index) => {
              if (!isValidImageSrc(image.imageUrl)) return null;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={image.id ?? index}
                  ref={(el) => { thumbRefs.current[index] = el; }}
                  type="button"
                  role="listitem"
                  aria-label={`Xem ảnh ${index + 1}`}
                  aria-pressed={isSelected}
                  className={`mp-pdp-gallery-thumb${isSelected ? " mp-pdp-gallery-thumb--active" : ""}`}
                  onClick={() => goTo(index)}
                >
                  <Image
                    src={image.imageUrl}
                    alt=""
                    fill
                    sizes="72px"
                    className="mp-pdp-gallery-thumb-img"
                  />
                </button>
              );
            })}
          </div>
        )}

        <div className="mp-pdp-gallery-main-wrap">
          <button
            type="button"
            className="mp-pdp-gallery-main"
            onClick={() => setLightboxOpen(true)}
            aria-label="Phóng to ảnh sản phẩm"
          >
            <Image
              src={selectedSrc}
              alt={selected.altText ?? mainAlt}
              fill
              className="mp-pdp-gallery-main-img"
              sizes="(max-width: 1024px) 100vw, 44vw"
              priority
            />
            <span className="mp-pdp-gallery-zoom-hint" aria-hidden>
              <ZoomIn size={18} />
            </span>
            {total > 1 && (
              <span className="mp-pdp-gallery-counter" aria-hidden>
                {selectedIndex + 1} / {total}
              </span>
            )}
          </button>

          {total > 1 && (
            <>
              <button
                type="button"
                className="mp-pdp-gallery-nav mp-pdp-gallery-nav--prev"
                aria-label="Ảnh trước"
                onClick={() => goTo(selectedIndex - 1)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="mp-pdp-gallery-nav mp-pdp-gallery-nav--next"
                aria-label="Ảnh tiếp"
                onClick={() => goTo(selectedIndex + 1)}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {total > 1 && (
          <div className="mp-pdp-gallery-thumbs mp-pdp-gallery-thumbs--horizontal" role="list">
            {gallery.map((image, index) => {
              if (!isValidImageSrc(image.imageUrl)) return null;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={`m-${image.id ?? index}`}
                  type="button"
                  role="listitem"
                  aria-label={`Xem ảnh ${index + 1}`}
                  aria-pressed={isSelected}
                  className={`mp-pdp-gallery-thumb${isSelected ? " mp-pdp-gallery-thumb--active" : ""}`}
                  onClick={() => goTo(index)}
                >
                  <Image
                    src={image.imageUrl}
                    alt=""
                    fill
                    sizes="64px"
                    className="mp-pdp-gallery-thumb-img"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div
          className="mp-pdp-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh sản phẩm"
        >
          <button
            type="button"
            className="mp-pdp-lightbox-close"
            aria-label="Đóng"
            onClick={() => setLightboxOpen(false)}
          >
            <X size={24} />
          </button>
          {total > 1 && (
            <>
              <button
                type="button"
                className="mp-pdp-lightbox-nav mp-pdp-lightbox-nav--prev"
                aria-label="Ảnh trước"
                onClick={() => goTo(selectedIndex - 1)}
              >
                <ChevronLeft size={28} />
              </button>
              <button
                type="button"
                className="mp-pdp-lightbox-nav mp-pdp-lightbox-nav--next"
                aria-label="Ảnh tiếp"
                onClick={() => goTo(selectedIndex + 1)}
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}
          <div className="mp-pdp-lightbox-img-wrap">
            <Image
              src={selectedSrc}
              alt={selected.altText ?? mainAlt}
              fill
              className="mp-pdp-lightbox-img"
              sizes="100vw"
            />
          </div>
          {total > 1 && (
            <p className="mp-pdp-lightbox-counter">
              {selectedIndex + 1} / {total}
            </p>
          )}
        </div>
      )}
    </>
  );
}
