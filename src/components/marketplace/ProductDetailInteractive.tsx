"use client";

import { useCallback, useMemo, useState } from "react";
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
  findVariant,
  getColorOptions,
  getInitialSelection,
  getSizeOptions,
  getVariantSizeKey,
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
  const initial = useMemo(() => getInitialSelection(variants), [variants]);
  const colorOptions = useMemo(() => getColorOptions(variants), [variants]);

  const [selectedColor, setSelectedColor] = useState<string | null>(initial.color);
  const [selectedSize, setSelectedSize] = useState<string | null>(initial.size);

  const selectedVariant = useMemo(
    () => findVariant(variants, selectedColor, selectedSize),
    [variants, selectedColor, selectedSize]
  );

  const galleryImages = useMemo(
    () => buildInteractiveGalleryImages(baseImages, variants, selectedVariant),
    [baseImages, variants, selectedVariant]
  );

  const variantStockLabel = selectedVariant
    ? VARIANT_STOCK_LABELS[selectedVariant.stockStatus] ?? aggregateStockLabel
    : aggregateStockLabel;
  const variantStockColor = selectedVariant
    ? VARIANT_STOCK_COLORS[selectedVariant.stockStatus] ?? aggregateStockColor
    : aggregateStockColor;

  const displayedCode = selectedVariant?.sku ?? productCode ?? null;

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
      setSelectedSize(getVariantSizeKey(v));
    },
    [variants]
  );

  const handleColorSelect = useCallback(
    (color: string) => {
      setSelectedColor(color);
      const sizes = getSizeOptions(variants, color);
      const nextSize =
        selectedSize && sizes.includes(selectedSize) ? selectedSize : sizes[0] ?? null;
      setSelectedSize(nextSize);
    },
    [variants, selectedSize]
  );

  const handleSizeSelect = useCallback((size: string) => {
    setSelectedSize(size);
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

            <div className="product-detail-gallery-col">
              <ProductGallery
                images={galleryImages}
                productName={displayName}
                selectedImageUrl={selectedVariant?.imageUrl}
              />
              <SupplierTrustCard />
            </div>

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
                selectedSize={selectedSize}
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

            <aside className="product-detail-inquiry-col product-detail-inquiry-col--desktop">
              <ProductInquiryPanel {...inquiryProps} />
            </aside>

            <div className="product-detail-inquiry-col product-detail-inquiry-col--mobile">
              <ProductInquiryPanel {...inquiryProps} />
            </div>
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
