"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

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

  // Clean up any pending fade timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function changeImage(index: number) {
    if (index === selectedIndex) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    // Fade out → swap → fade in
    setMainOpacity(0);
    timerRef.current = setTimeout(() => {
      setSelectedIndex(index);
      setMainOpacity(1);
    }, 130);

    // Bring the clicked thumbnail into view on horizontal scroll
    thumbRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  if (total === 0) {
    return (
      <div
        style={{
          aspectRatio: "1 / 1",
          background: "#f3f4f6",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          color: "#9ca3af",
        }}
      >
        Hình ảnh sản phẩm
      </div>
    );
  }

  const selected = images[selectedIndex] ?? images[0];

  return (
    <div>
      {/* ── Main image ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#f3f4f6",
          opacity: mainOpacity,
          transition: "opacity 0.13s ease",
        }}
      >
        <Image
          src={selected.imageUrl}
          alt={selected.altText ?? productName}
          fill
          style={{ objectFit: "cover" }}
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />

        {/* Image counter badge */}
        {total > 1 && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: "12px",
              right: "12px",
              background: "rgba(0, 0, 0, 0.45)",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 600,
              lineHeight: 1,
              padding: "5px 10px",
              borderRadius: "20px",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {selectedIndex + 1} / {total}
          </div>
        )}
      </div>

      {/* ── Thumbnail strip ─────────────────────────────────────────────────── */}
      {total > 1 && (
        <div
          role="list"
          aria-label="Xem ảnh sản phẩm"
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "12px",
            overflowX: "auto",
            // Extra bottom padding gives scrollbar clearance and breathing room
            paddingBottom: "6px",
            // Prevent thumbnail strip from collapsing on short content
            minHeight: "88px",
          }}
        >
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
                style={{
                  position: "relative",
                  width: "72px",
                  height: "72px",
                  flexShrink: 0,
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "none",
                  padding: 0,
                  cursor: isSelected ? "default" : "pointer",
                  background: "#f3f4f6",
                  // Use box-shadow instead of outline for smooth CSS transition
                  boxShadow: isSelected
                    ? "0 0 0 2px var(--primary)"
                    : "0 0 0 2px transparent",
                  // Dim unselected; slightly brighten on hover
                  opacity: isSelected ? 1 : isHovered ? 0.82 : 0.55,
                  // Subtle lift on hover
                  transform: isHovered ? "scale(1.05)" : "scale(1)",
                  transition:
                    "opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
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
