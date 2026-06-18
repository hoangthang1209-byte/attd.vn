"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductGallery from "@/components/marketplace/ProductGallery";
import ProductInquiryPanel from "@/components/marketplace/ProductInquiryPanel";
import ProductOptionSelector from "@/components/marketplace/ProductOptionSelector";
import ProductOptionTable from "@/components/marketplace/ProductOptionTable";
import ProductKeyAttributes from "@/components/marketplace/ProductKeyAttributes";
import SupplierTrustCard from "@/components/marketplace/SupplierTrustCard";
import ProductStatusRow from "@/components/marketplace/ProductStatusRow";
import ProductQuoteTiers from "@/components/marketplace/ProductQuoteTiers";
import ProductHighlights from "@/components/marketplace/ProductHighlights";
import ProductDetailTabs from "@/components/marketplace/ProductDetailTabs";
import ProductSpecTable from "@/components/marketplace/ProductSpecTable";
import type { ProductImageRecord } from "@/lib/productImages";
import type { PublicVariantRow } from "@/lib/productVariants";
import {
  VARIANT_STOCK_COLORS,
  VARIANT_STOCK_LABELS,
  buildInteractiveGalleryImages,
  findSelectedVariant,
  getColorOptions,
  getSizeOptions,
  getVariantSizeKey,
  warnAllVariantMismatches,
} from "@/lib/productVariants";

type KeyAttributesProps = {
  material?: string | null;
  form?: string | null;
  fit?: string | null;
  defaultMoq?: number | null;
  leadTime?: string | null;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
};

type ProductDetailInteractiveProps = {
  displayName: string;
  categoryName: string;
  categorySlug: string;
  productCode?: string | null;
  displayShortDescription?: string | null;
  displayContent?: string | null;
  baseImages: ProductImageRecord[];
  variants: PublicVariantRow[];
  material?: string | null;
  defaultMoq?: number | null;
  leadTime?: string | null;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  aggregateStockLabel?: string | null;
  aggregateStockColor?: string;
  skuCount: number;
  keyAttributes: KeyAttributesProps;
  useCases?: string[];
  targetCustomers?: string[];
  gsm?: number | null;
};

export default function ProductDetailInteractive({
  displayName,
  categoryName,
  categorySlug,
  productCode,
  displayShortDescription,
  displayContent,
  baseImages,
  variants,
  material,
  defaultMoq,
  leadTime,
  supportsPrinting,
  supportsEmbroidery,
  supportsOem,
  aggregateStockLabel,
  aggregateStockColor,
  skuCount,
  keyAttributes,
  useCases = [],
  targetCustomers = [],
  gsm,
}: ProductDetailInteractiveProps) {
  useEffect(() => {
    warnAllVariantMismatches(variants);
  }, [variants]);

  const colorOptions = useMemo(() => getColorOptions(variants), [variants]);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSizeOrSpec, setSelectedSizeOrSpec] = useState<string | null>(null);

  const selectedVariant = useMemo(
    () => findSelectedVariant(variants, selectedColor, selectedSizeOrSpec),
    [variants, selectedColor, selectedSizeOrSpec]
  );

  const galleryImages = useMemo(() => {
    if (!selectedVariant) return baseImages;
    return buildInteractiveGalleryImages(
      baseImages,
      variants,
      selectedVariant,
      true
    );
  }, [baseImages, variants, selectedVariant]);

  const variantStockLabel = selectedVariant
    ? VARIANT_STOCK_LABELS[selectedVariant.stockStatus] ?? aggregateStockLabel
    : aggregateStockLabel;
  const variantStockColor = selectedVariant
    ? VARIANT_STOCK_COLORS[selectedVariant.stockStatus] ?? aggregateStockColor
    : aggregateStockColor;

  const displayedCode = selectedVariant ? selectedVariant.sku : productCode ?? null;

  const keyAttrsWithStock = {
    ...keyAttributes,
    stockLabel: variantStockLabel,
    stockColor: variantStockColor,
  };

  const selectVariantById = useCallback(
    (variantId: string) => {
      const v = variants.find((item) => item.id === variantId);
      if (!v) return;
      setSelectedColor(v.colorName ?? null);
      setSelectedSizeOrSpec(getVariantSizeKey(v));
    },
    [variants]
  );

  const handleColorSelect = useCallback(
    (color: string) => {
      setSelectedColor(color);
      setSelectedSizeOrSpec((prev) => {
        if (!prev) return null;
        const sizes = getSizeOptions(variants, color);
        return sizes.includes(prev) ? prev : null;
      });
    },
    [variants]
  );

  const handleSizeSelect = useCallback((size: string) => {
    setSelectedSizeOrSpec(size);
  }, []);

  const inquiryProps = {
    stockLabel: variantStockLabel,
    stockColor: variantStockColor,
    productName: displayName,
    productCode: displayedCode,
    defaultMoq,
    leadTime,
    stockQty: selectedVariant?.stockQty,
    skuCount,
    supportsPrinting,
    supportsEmbroidery,
    supportsOem,
  };

  return (
    <>
      <section className="mp-pdp-hero">
        <div className="container">
          <div className="product-detail-grid">
            <div className="product-detail-left">
              <ProductGallery
                images={galleryImages}
                productName={displayName}
                selectedImageUrl={selectedVariant?.imageUrl ?? null}
              />
              <SupplierTrustCard />
            </div>

            <div className="product-detail-center">
              <header className="product-detail-head">
                <div className="mp-product-detail-meta">
                  <Link href={`/${categorySlug}`} className="mp-product-detail-cat">
                    {categoryName}
                  </Link>
                  {displayedCode && (
                    <span className="mp-product-detail-code">
                      Mã sản phẩm: {displayedCode}
                    </span>
                  )}
                </div>
                <h1 className="mp-product-detail-title">{displayName}</h1>
              </header>

              <div className="product-detail-status">
                <ProductStatusRow
                  stockLabel={variantStockLabel}
                  stockColor={variantStockColor}
                  skuCount={skuCount}
                />
              </div>

              <div className="product-detail-quote">
                <ProductQuoteTiers />
              </div>

              <div className="product-detail-options">
                <ProductOptionSelector
                  variants={variants}
                  material={material}
                  colorOptions={colorOptions}
                  selectedColor={selectedColor}
                  selectedSize={selectedSizeOrSpec}
                  onColorSelect={handleColorSelect}
                  onSizeSelect={handleSizeSelect}
                />
              </div>

              <div className="product-detail-keyattrs">
                <ProductKeyAttributes {...keyAttrsWithStock} compact />
              </div>

              <div className="product-detail-highlights">
                <ProductHighlights
                  shortDescription={displayShortDescription}
                  description={displayContent}
                  material={material}
                  form={keyAttributes.form}
                  defaultMoq={defaultMoq}
                  leadTime={leadTime}
                  useCases={useCases}
                  supportsPrinting={supportsPrinting}
                  supportsEmbroidery={supportsEmbroidery}
                  supportsOem={supportsOem}
                />
              </div>
            </div>

            <aside className="product-detail-right">
              <ProductInquiryPanel {...inquiryProps} />
            </aside>
          </div>

          <ProductDetailTabs />

          <div className="mp-pdp-page-sections">
            <section className="mp-section mp-section--compact" id="mp-pdp-info">
              <ProductSpecTable
                material={material}
                form={keyAttributes.form}
                fit={keyAttributes.fit}
                gsm={gsm}
                defaultMoq={defaultMoq}
                leadTime={leadTime}
                useCases={useCases}
                targetCustomers={targetCustomers}
                supportsPrinting={supportsPrinting}
                supportsEmbroidery={supportsEmbroidery}
                supportsOem={supportsOem}
              />
              <div className="mp-pdp-info-keyattrs">
                <ProductKeyAttributes
                  {...keyAttrsWithStock}
                  compact
                  className="mp-pdp-keyattrs--lower"
                />
              </div>
            </section>

            <section className="mp-section mp-section--alt mp-section--compact" id="mp-pdp-options-wrap">
              <ProductOptionTable
                variants={variants}
                selectedVariantId={selectedVariant?.id}
                onSelectVariant={selectVariantById}
              />
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
