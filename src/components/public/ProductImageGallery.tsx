"use client";

import { useState } from "react";
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

  if (images.length === 0) {
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
      {/* Main image */}
      <div
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#f3f4f6",
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
      </div>

      {/* Thumbnail strip — only when more than one image */}
      {images.length > 1 && (
        <div
          role="list"
          aria-label="Xem ảnh sản phẩm"
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "12px",
            overflowX: "auto",
            paddingBottom: "4px",
          }}
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              role="listitem"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Ảnh ${index + 1}`}
              aria-pressed={index === selectedIndex}
              style={{
                position: "relative",
                width: "80px",
                height: "80px",
                flexShrink: 0,
                borderRadius: "8px",
                overflow: "hidden",
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: "#f3f4f6",
                outline:
                  index === selectedIndex
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                outlineOffset: "2px",
              }}
            >
              <Image
                src={image.imageUrl}
                alt={image.altText ?? `${productName} ${index + 1}`}
                fill
                sizes="80px"
                style={{ objectFit: "cover" }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
