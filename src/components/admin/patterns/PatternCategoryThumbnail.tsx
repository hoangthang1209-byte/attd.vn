"use client";

import { ImageIcon } from "lucide-react";
import { useState } from "react";
import {
  getPatternCategoryInitials,
  resolvePatternCategoryImageUrl,
  type PatternCategoryVisualInput,
} from "@/features/patterns/pattern-category-visual";

type Props = {
  category: PatternCategoryVisualInput | null | undefined;
  size?: "list" | "header" | "picker";
  className?: string;
  showName?: boolean;
};

export default function PatternCategoryThumbnail({
  category,
  size = "list",
  className,
  showName = false,
}: Props) {
  const [broken, setBroken] = useState(false);
  const imageUrl = resolvePatternCategoryImageUrl(category);
  const name = category?.name?.trim() ?? "";
  const initials = getPatternCategoryInitials(name);
  const showImage = Boolean(imageUrl) && !broken;
  const label = name ? `Danh mục: ${name}` : "Chưa có ảnh danh mục";

  return (
    <div
      className={[
        "pattern-category-thumb",
        `pattern-category-thumb--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={label}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl!}
          alt=""
          className="pattern-category-thumb__image"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="pattern-category-thumb__placeholder" aria-label={label}>
          {name ? (
            <span className="pattern-category-thumb__initials" aria-hidden>
              {initials}
            </span>
          ) : (
            <ImageIcon size={18} strokeWidth={1.75} aria-hidden />
          )}
        </span>
      )}
      {showName && name ? (
        <span className="pattern-category-thumb__name">{name}</span>
      ) : null}
    </div>
  );
}
