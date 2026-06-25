"use client";

import { ImageIcon } from "lucide-react";
import { useState } from "react";

function isUsableImageUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

type Props = {
  imageUrl?: string | null;
  name: string;
};

export default function CategoryListThumbnail({ imageUrl, name }: Props) {
  const [broken, setBroken] = useState(false);
  const title = `Ảnh danh mục: ${name}`;
  const url = imageUrl?.trim() ?? "";
  const showImage = isUsableImageUrl(url) && !broken;

  if (!showImage) {
    return (
      <span
        className="admin-category-table__thumb-placeholder"
        title={title}
        aria-label={title}
      >
        <ImageIcon size={18} strokeWidth={1.75} aria-hidden />
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="admin-category-table__thumb-link"
      title={title}
      aria-label={`${title} — mở ảnh`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="admin-category-list-thumb"
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    </a>
  );
}
