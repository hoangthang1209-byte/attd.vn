"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import ProductMediaFrame from "@/components/public/ProductMediaFrame";
import {
  getProductGalleryImages,
  type ProductImageRecord,
} from "@/lib/productImages";
import { isValidImageSrc } from "@/lib/imagePaths";
import {
  getPdpMainImageUrl,
  getPdpZoomImageUrl,
  PDP_MAIN_IMAGE_QUALITY,
  PDP_MAIN_IMAGE_SIZES,
  PDP_ZOOM_IMAGE_QUALITY,
  PDP_ZOOM_IMAGE_SIZES,
} from "@/lib/pdpImageUrls";

type Props = {
  images: ProductImageRecord[];
  productName: string;
  selectedImageUrl?: string | null;
};

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled"));
}

export default function ProductGallery({ images, productName, selectedImageUrl }: Props) {
  const [manualPick, setManualPick] = useState<{ key: string; index: number } | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mainTriggerRef = useRef<HTMLButtonElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const gallery = useMemo(() => {
    return getProductGalleryImages(images).filter((img) => isValidImageSrc(img.imageUrl));
  }, [images]);

  const galleryKey = gallery.map((img) => img.imageUrl).join("|");
  const total = gallery.length;

  const prevSelectedUrl = useRef(selectedImageUrl);
  useEffect(() => {
    if (selectedImageUrl !== prevSelectedUrl.current) {
      setManualPick(null);
      prevSelectedUrl.current = selectedImageUrl;
    }
  }, [selectedImageUrl]);

  const clampIndex = useCallback(
    (index: number) => {
      if (total === 0) return 0;
      return Math.max(0, Math.min(index, total - 1));
    },
    [total],
  );

  const selectedIndex = useMemo(() => {
    if (manualPick && manualPick.key === galleryKey) {
      return clampIndex(manualPick.index);
    }

    if (selectedImageUrl && isValidImageSrc(selectedImageUrl)) {
      const idx = gallery.findIndex((img) => img.imageUrl === selectedImageUrl);
      if (idx >= 0) return idx;
    }

    return 0;
  }, [manualPick, galleryKey, gallery, selectedImageUrl, clampIndex]);

  const selectedSrc = useMemo(() => {
    if (total === 0) return null;
    const image = gallery[selectedIndex] ?? gallery[0];
    return image?.imageUrl ?? null;
  }, [total, gallery, selectedIndex]);

  const mainImageSrc = useMemo(
    () => (selectedSrc ? getPdpMainImageUrl(selectedSrc) : null),
    [selectedSrc],
  );
  const zoomImageSrc = useMemo(
    () => (selectedSrc ? getPdpZoomImageUrl(selectedSrc) : null),
    [selectedSrc],
  );

  const goTo = useCallback(
    (index: number, { loop = true }: { loop?: boolean } = {}) => {
      if (total === 0) return;
      let next = index;
      if (loop) {
        next = (index + total) % total;
      } else {
        next = clampIndex(index);
      }
      setManualPick({ key: galleryKey, index: next });
      thumbRefs.current[next]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    },
    [galleryKey, total, clampIndex],
  );

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    requestAnimationFrame(() => {
      mainTriggerRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
        return;
      }
      if (total <= 1) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(selectedIndex - 1, { loop: false });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(selectedIndex + 1, { loop: false });
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, closeLightbox, goTo, selectedIndex, total]);

  useEffect(() => {
    if (!lightboxOpen || !lightboxRef.current) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !lightboxRef.current) return;
      const focusable = getFocusableElements(lightboxRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen]);

  const handleMainKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (total <= 1) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(selectedIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(selectedIndex + 1);
      }
    },
    [goTo, selectedIndex, total],
  );

  if (total === 0) {
    return (
      <div className="mp-pdp-gallery mp-pdp-gallery--empty" aria-label="Ảnh sản phẩm">
        <ProductMediaFrame
          alt={productName}
          placeholderLabel={productName}
          sizes={PDP_MAIN_IMAGE_SIZES}
        />
      </div>
    );
  }

  if (!selectedSrc || !mainImageSrc || !zoomImageSrc) {
    return (
      <div className="mp-pdp-gallery mp-pdp-gallery--empty" aria-label="Ảnh sản phẩm">
        <ProductMediaFrame
          alt={productName}
          placeholderLabel={productName}
          sizes={PDP_MAIN_IMAGE_SIZES}
        />
      </div>
    );
  }

  const selected = gallery[selectedIndex] ?? gallery[0];
  const mainAlt =
    total > 1 ? `${productName} — ảnh ${selectedIndex + 1}` : productName;
  const canGoPrev = selectedIndex > 0;
  const canGoNext = selectedIndex < total - 1;

  const lightbox =
    lightboxOpen &&
    createPortal(
      <div
        ref={lightboxRef}
        className="mp-pdp-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Xem ảnh sản phẩm"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeLightbox();
        }}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="mp-pdp-lightbox-close"
          aria-label="Đóng"
          onClick={closeLightbox}
        >
          <X size={24} />
        </button>

        {total > 1 && (
          <>
            <button
              type="button"
              className="mp-pdp-lightbox-nav mp-pdp-lightbox-nav--prev"
              aria-label="Ảnh trước"
              disabled={!canGoPrev}
              onClick={() => goTo(selectedIndex - 1, { loop: false })}
            >
              <ChevronLeft size={28} />
            </button>
            <button
              type="button"
              className="mp-pdp-lightbox-nav mp-pdp-lightbox-nav--next"
              aria-label="Ảnh tiếp"
              disabled={!canGoNext}
              onClick={() => goTo(selectedIndex + 1, { loop: false })}
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}

        <div className="mp-pdp-lightbox-img-wrap">
          <Image
            key={`lb-${zoomImageSrc}`}
            src={zoomImageSrc}
            alt={selected.altText ?? mainAlt}
            fill
            className="mp-pdp-lightbox-img"
            sizes={PDP_ZOOM_IMAGE_SIZES}
            quality={PDP_ZOOM_IMAGE_QUALITY}
          />
        </div>

        <p className="mp-pdp-lightbox-counter" aria-live="polite">
          {selectedIndex + 1} / {total}
        </p>
      </div>,
      document.body,
    );

  return (
    <>
      <div className="mp-pdp-gallery" aria-label="Thư viện ảnh sản phẩm">
        <div className="mp-pdp-gallery-stage">
          <div className="mp-pdp-gallery-main-wrap">
            <button
              ref={mainTriggerRef}
              type="button"
              className="mp-pdp-gallery-main"
              onClick={() => setLightboxOpen(true)}
              onKeyDown={handleMainKeyDown}
              aria-label="Phóng to ảnh sản phẩm"
              aria-describedby={total > 1 ? `pdp-gallery-thumb-${selectedIndex}` : undefined}
            >
              <Image
                key={mainImageSrc}
                src={mainImageSrc}
                alt={selected.altText ?? mainAlt}
                fill
                className="mp-pdp-gallery-main-img"
                sizes={PDP_MAIN_IMAGE_SIZES}
                quality={PDP_MAIN_IMAGE_QUALITY}
                priority={selectedIndex === 0}
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
        </div>

        {total > 1 && (
          <div
            className="mp-pdp-gallery-thumbs"
            role="tablist"
            aria-label="Ảnh thu nhỏ"
          >
            {gallery.map((image, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={image.id ?? `thumb-${index}`}
                  ref={(el) => {
                    thumbRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`pdp-gallery-thumb-${index}`}
                  aria-label={`Xem ảnh ${index + 1}`}
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  className={`mp-pdp-gallery-thumb${isSelected ? " mp-pdp-gallery-thumb--active" : ""}`}
                  onClick={() => goTo(index)}
                >
                  <Image
                    src={image.imageUrl}
                    alt=""
                    fill
                    sizes="56px"
                    className="mp-pdp-gallery-thumb-img"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {lightbox}
    </>
  );
}
