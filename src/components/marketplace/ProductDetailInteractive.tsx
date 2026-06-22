"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import ProductGallery from "@/components/marketplace/ProductGallery";
import ProductDynamicOptionSelector from "@/components/marketplace/ProductDynamicOptionSelector";
import ProductPdpConversionPanel from "@/components/marketplace/ProductPdpConversionPanel";
import ProductPdpMobileBar from "@/components/marketplace/ProductPdpMobileBar";
import ProductSpecificationsSection from "@/components/marketplace/ProductSpecificationsSection";
import ProductCustomizationsSection from "@/components/marketplace/ProductCustomizationsSection";
import ProductDetailTabs from "@/components/marketplace/ProductDetailTabs";
import ProductQuoteDialog from "@/components/public/ProductQuoteDialog";
import type { PublicProductDetail } from "@/features/products/product-detail.types";
import {
  findVariantBySelection,
  getInitialSelection,
  type OptionSelectionState,
} from "@/lib/productOptionSelection";
import { resolveQuoteVariantId } from "@/features/products/product-catalog-qa-regression";
import { buildInteractiveGalleryImages } from "@/lib/productVariants";
import { formatPdpMoqText, isPublicMoq } from "@/lib/formatMoq";

const STOCK_LABELS: Record<string, string> = {
  IN_STOCK: "Còn hàng",
  LOW_STOCK: "Sắp hết hàng",
  OUT_OF_STOCK: "Hết hàng / Đặt trước",
};

const STOCK_COLORS: Record<string, string> = {
  IN_STOCK: "#16a34a",
  LOW_STOCK: "#d97706",
  OUT_OF_STOCK: "#dc2626",
};

type Props = {
  product: PublicProductDetail;
  displayName: string;
  displayShortDescription?: string | null;
  displayContent?: string | null;
  showFaqTab?: boolean;
  showRelatedTab?: boolean;
};

export default function ProductDetailInteractive({
  product,
  displayName,
  displayShortDescription,
  displayContent,
  showFaqTab = true,
  showRelatedTab = false,
}: Props) {
  const [selection, setSelection] = useState<OptionSelectionState>(() =>
    getInitialSelection(product.optionGroups),
  );
  const [quoteOpen, setQuoteOpen] = useState(false);

  const selectedVariant = useMemo(
    () => findVariantBySelection(product.variants, product.optionGroups, selection),
    [product.variants, product.optionGroups, selection],
  );

  const quoteVariantId = useMemo(
    () =>
      resolveQuoteVariantId(
        product.variants.map((v) => ({ id: v.id, variantStatus: "ACTIVE" })),
        selectedVariant?.id ?? null,
      ),
    [product.variants, selectedVariant?.id],
  );

  const anchorTabs = useMemo(() => {
    const tabs = [{ id: "mp-pdp-overview", label: "Tổng quan" }];
    if (product.specifications.length > 0) {
      tabs.push({ id: "mp-pdp-specs", label: "Thông số" });
    }
    if (displayContent || displayShortDescription) {
      tabs.push({ id: "mp-pdp-desc", label: "Mô tả" });
    }
    if (product.customizations.length > 0) {
      tabs.push({ id: "mp-pdp-custom", label: "Tùy chỉnh" });
    }
    if (showFaqTab) tabs.push({ id: "mp-pdp-faq", label: "FAQ" });
    if (showRelatedTab) tabs.push({ id: "mp-pdp-related", label: "Liên quan" });
    return tabs;
  }, [
    product.specifications.length,
    product.customizations.length,
    displayContent,
    displayShortDescription,
    showFaqTab,
    showRelatedTab,
  ]);

  const hasActiveVariants = product.variants.length > 0;
  const showVariantSelector = product.optionGroups.length > 0 && hasActiveVariants;

  const galleryImages = useMemo(() => {
    const legacyVariant = selectedVariant
      ? {
          id: selectedVariant.id,
          sku: selectedVariant.sku,
          colorName: selectedVariant.colorName,
          colorCode: selectedVariant.colorCode,
          sizeName: selectedVariant.sizeName,
          dimensions: selectedVariant.dimensions,
          capacity: selectedVariant.capacity,
          stockStatus: selectedVariant.stockStatus,
          imageUrl: selectedVariant.imageUrl,
          stockQty: selectedVariant.stockQty,
        }
      : null;

    if (!legacyVariant) return product.images;
    return buildInteractiveGalleryImages(product.images, [legacyVariant], legacyVariant, true);
  }, [product.images, selectedVariant]);

  const effectiveMoq = selectedVariant?.moq ?? product.defaultMoq;
  const effectiveLeadTime = selectedVariant?.leadTime ?? product.leadTime;
  const displayedCode = selectedVariant?.sku ?? product.productCode ?? null;
  const stockLabel = selectedVariant
    ? STOCK_LABELS[selectedVariant.stockStatus]
    : product.variants.length
      ? null
      : null;
  const stockColor = selectedVariant
    ? STOCK_COLORS[selectedVariant.stockStatus] ?? "#16a34a"
    : "#16a34a";

  const handleOptionSelect = useCallback((groupSlug: string, valueLabel: string) => {
    setSelection((prev) => ({ ...prev, [groupSlug]: valueLabel }));
  }, []);

  const openQuote = useCallback(() => setQuoteOpen(true), []);
  const closeQuote = useCallback(() => setQuoteOpen(false), []);

  const quoteContext = {
    id: product.id,
    slug: product.slug,
    name: displayName,
    category: product.category.name,
    imageUrl: galleryImages[0]?.imageUrl ?? null,
    moq: effectiveMoq,
    leadTime: effectiveLeadTime,
    variantId: quoteVariantId,
    variantLabel: selectedVariant?.id === quoteVariantId ? selectedVariant?.label ?? null : null,
    variantSku: selectedVariant?.id === quoteVariantId ? selectedVariant?.sku ?? null : null,
    optionSelections: selectedVariant?.optionSelections ?? selection,
  };

  return (
    <>
      <section className="mp-pdp-hero">
        <div className="container">
          <div className="product-detail-grid" id="mp-pdp-overview">
            <div className="product-detail-left">
              <ProductGallery
                images={galleryImages}
                productName={displayName}
                selectedImageUrl={selectedVariant?.imageUrl ?? null}
              />
            </div>

            <div className="product-detail-center">
              <header className="product-detail-head">
                <div className="mp-product-detail-meta">
                  <Link href={`/${product.category.slug}`} className="mp-product-detail-cat">
                    {product.category.name}
                  </Link>
                  {displayedCode && (
                    <span className="mp-product-detail-code">Mã: {displayedCode}</span>
                  )}
                </div>
                <h1 className="mp-product-detail-title">{displayName}</h1>
                {displayShortDescription && (
                  <p className="mp-product-detail-summary">{displayShortDescription}</p>
                )}
              </header>

              <div className="mp-pdp-core-facts">
                {isPublicMoq(effectiveMoq) && (
                  <div className="mp-pdp-core-fact">
                    <span className="mp-pdp-core-fact-label">MOQ</span>
                    <span className="mp-pdp-core-fact-value">{formatPdpMoqText(effectiveMoq)}</span>
                  </div>
                )}
                {effectiveLeadTime && (
                  <div className="mp-pdp-core-fact">
                    <span className="mp-pdp-core-fact-label">Thời gian sản xuất</span>
                    <span className="mp-pdp-core-fact-value">{effectiveLeadTime}</span>
                  </div>
                )}
                {stockLabel && (
                  <div className="mp-pdp-core-fact">
                    <span className="mp-pdp-core-fact-label">Tình trạng</span>
                    <span className="mp-pdp-core-fact-value" style={{ color: stockColor }}>
                      {stockLabel}
                    </span>
                  </div>
                )}
              </div>

              {product.customizations.length > 0 && (
                <div className="mp-pdp-capability-chips">
                  {product.customizations.map((item) => (
                    <span key={item.id} className="mp-pdp-capability-chip">
                      {item.label}
                    </span>
                  ))}
                </div>
              )}

              {showVariantSelector && (
                <div className="product-detail-options">
                  <ProductDynamicOptionSelector
                    optionGroups={product.optionGroups}
                    variants={product.variants}
                    selection={selection}
                    onSelect={handleOptionSelect}
                  />
                </div>
              )}

              {product.optionGroups.length > 0 && !hasActiveVariants && (
                <p className="mp-pdp-no-variants-hint" role="status">
                  Hiện không có phân loại đang bán. Vui lòng liên hệ để được tư vấn và báo giá.
                </p>
              )}

              {product.specifications.length > 0 && (
                <div className="mp-pdp-spec-preview-wrap">
                  <ProductSpecificationsSection rows={product.specifications} preview />
                </div>
              )}
            </div>

            <ProductPdpConversionPanel
              productName={displayName}
              productCode={displayedCode}
              variantLabel={selectedVariant?.label}
              moq={effectiveMoq}
              leadTime={effectiveLeadTime}
              stockLabel={stockLabel}
              stockColor={stockColor}
              onRequestQuote={openQuote}
            />
          </div>

          <ProductDetailTabs tabs={anchorTabs} />
        </div>
      </section>

      {product.specifications.length > 0 && (
        <ProductSpecificationsSection rows={product.specifications} />
      )}

      {(displayContent || displayShortDescription) && (
        <section className="mp-section mp-section--compact" id="mp-pdp-desc">
          <div className="container mp-pdp-desc">
            <h2 className="mp-section-title">Mô tả sản phẩm</h2>
            <div className="mp-pdp-desc-content">
              {displayShortDescription && (
                <p className="product-desc-lead">{displayShortDescription}</p>
              )}
              {displayContent && <div className="product-desc-body">{displayContent}</div>}
            </div>
          </div>
        </section>
      )}

      <ProductCustomizationsSection items={product.customizations} onRequestQuote={openQuote} />

      <ProductPdpMobileBar onRequestQuote={openQuote} />

      <ProductQuoteDialog
        open={quoteOpen}
        onClose={closeQuote}
        product={quoteContext}
        restoreFocusRef={{ current: null }}
      />
    </>
  );
}
