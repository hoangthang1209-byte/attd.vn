"use client";

import type { ProductOptionGroup } from "@/features/products/product-detail.types";
import {
  getAvailableValues,
  isValueAvailable,
  type OptionSelectionState,
} from "@/lib/productOptionSelection";
import type { PublicProductVariantDetail } from "@/features/products/product-detail.types";
import Image from "next/image";
import { isValidImageSrc } from "@/lib/imagePaths";
import { isProductScopedImageUrl } from "@/lib/productImageScope";
import {
  isLightColorSwatch,
  resolveStructuredSwatchHex,
} from "@/features/products/product-card-color-swatches";

type Props = {
  optionGroups: ProductOptionGroup[];
  variants: PublicProductVariantDetail[];
  selection: OptionSelectionState;
  onSelect: (groupSlug: string, valueLabel: string) => void;
  allowedImageUrls?: ReadonlySet<string>;
};

function isColorGroup(group: ProductOptionGroup): boolean {
  const slug = group.slug.toLowerCase();
  const name = group.name.toLowerCase();
  return slug.includes("color") || slug.includes("mau") || name.includes("màu");
}

export default function ProductDynamicOptionSelector({
  optionGroups,
  variants,
  selection,
  onSelect,
  allowedImageUrls,
}: Props) {
  if (!optionGroups.length) return null;

  return (
    <div className="mp-pdp-option-chips">
      {optionGroups.map((group) => {
        const availableValues = getAvailableValues(variants, optionGroups, group.slug, selection);
        if (!availableValues.length) return null;
        const colorGroup = isColorGroup(group);

        return (
          <div key={group.id} className="mp-pdp-chip-group">
            <p className="mp-pdp-chip-label" id={`pdp-option-${group.slug}`}>
              {group.name}
            </p>
            <div
              className="mp-pdp-chip-list"
              role="listbox"
              aria-labelledby={`pdp-option-${group.slug}`}
            >
              {group.values.map((value) => {
                const available = isValueAvailable(
                  variants,
                  optionGroups,
                  group.slug,
                  value.label,
                  selection,
                );
                const isActive = selection[group.slug] === value.label;
                const swatchUrl =
                  value.imageUrl &&
                  isValidImageSrc(value.imageUrl) &&
                  (!allowedImageUrls || isProductScopedImageUrl(value.imageUrl, allowedImageUrls))
                    ? value.imageUrl
                    : null;
                const swatchHex = colorGroup
                  ? resolveStructuredSwatchHex(value.swatchHex)
                  : null;
                const lightSwatch = swatchHex ? isLightColorSwatch(swatchHex) : false;

                return (
                  <button
                    key={value.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    disabled={!available}
                    className={`mp-pdp-chip mp-pdp-chip--selectable${
                      colorGroup ? " mp-pdp-chip--color" : ""
                    }${isActive ? " mp-pdp-chip--active" : ""}${
                      !available ? " mp-pdp-chip--disabled" : ""
                    }`}
                    onClick={() => onSelect(group.slug, value.label)}
                  >
                    {colorGroup && swatchUrl ? (
                      <span className="mp-pdp-chip-thumb">
                        <Image
                          src={swatchUrl}
                          alt=""
                          fill
                          sizes="48px"
                          className="mp-pdp-chip-thumb-img"
                        />
                      </span>
                    ) : colorGroup && swatchHex ? (
                      <span
                        className={`mp-pdp-chip-dot${lightSwatch ? " mp-pdp-chip-dot--light" : ""}`}
                        style={{ backgroundColor: swatchHex }}
                        aria-hidden
                      />
                    ) : null}
                    {value.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
