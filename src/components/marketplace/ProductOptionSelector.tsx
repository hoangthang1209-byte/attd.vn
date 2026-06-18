"use client";

import Image from "next/image";
import { isValidImageSrc } from "@/lib/imagePaths";
import type { ColorOption, PublicVariantRow } from "@/lib/productVariants";
import { getSizeOptions, isSizeAvailable } from "@/lib/productVariants";

type ProductOptionSelectorProps = {
  variants: PublicVariantRow[];
  material?: string | null;
  colorOptions: ColorOption[];
  selectedColor: string | null;
  selectedSize: string | null;
  onColorSelect: (color: string) => void;
  onSizeSelect: (size: string) => void;
};

export default function ProductOptionSelector({
  variants,
  material,
  colorOptions,
  selectedColor,
  selectedSize,
  onColorSelect,
  onSizeSelect,
}: ProductOptionSelectorProps) {
  const sizes = getSizeOptions(variants, selectedColor);

  if (colorOptions.length === 0 && sizes.length === 0 && !material) {
    return null;
  }

  return (
    <div className="mp-pdp-option-chips">
      {colorOptions.length > 0 && (
        <div className="mp-pdp-chip-group">
          <p className="mp-pdp-chip-label">Màu sắc</p>
          <div className="mp-pdp-chip-list" role="list">
            {colorOptions.map((color) => {
              const isActive = selectedColor === color.name;
              const hasImg = color.imageUrl && isValidImageSrc(color.imageUrl);

              return (
                <button
                  key={color.name}
                  type="button"
                  role="listitem"
                  aria-pressed={isActive}
                  className={`mp-pdp-chip mp-pdp-chip--selectable mp-pdp-chip--color${
                    isActive ? " mp-pdp-chip--active" : ""
                  }`}
                  onClick={() => onColorSelect(color.name)}
                >
                  {hasImg ? (
                    <span className="mp-pdp-chip-thumb">
                      <Image
                        src={color.imageUrl!}
                        alt={color.name}
                        fill
                        sizes="40px"
                        className="mp-pdp-chip-thumb-img"
                      />
                    </span>
                  ) : color.colorCode ? (
                    <span
                      className="mp-pdp-chip-dot"
                      style={{
                        background: color.colorCode.startsWith("#")
                          ? color.colorCode
                          : undefined,
                      }}
                      aria-hidden
                    />
                  ) : null}
                  <span>{color.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div className="mp-pdp-chip-group">
          <p className="mp-pdp-chip-label">Size / Kích thước / Dung tích</p>
          <div className="mp-pdp-chip-list" role="list">
            {sizes.map((size) => {
              const available = isSizeAvailable(variants, selectedColor, size);
              const isActive = selectedSize === size;

              return (
                <button
                  key={size}
                  type="button"
                  role="listitem"
                  aria-pressed={isActive}
                  disabled={!available}
                  className={`mp-pdp-chip mp-pdp-chip--selectable${
                    isActive ? " mp-pdp-chip--active" : ""
                  }${!available ? " mp-pdp-chip--disabled" : ""}`}
                  onClick={() => available && onSizeSelect(size)}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {material && (
        <div className="mp-pdp-chip-group">
          <p className="mp-pdp-chip-label">Chất liệu / Quy cách</p>
          <div className="mp-pdp-chip-list">
            <span className="mp-pdp-chip mp-pdp-chip--material mp-pdp-chip--active">
              {material}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
