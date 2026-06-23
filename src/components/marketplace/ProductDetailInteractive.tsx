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
import { resolveQuoteVariantId } from "@/features/products/product-pdp.utils";
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
  const optionGroups = product.optionGroups ?? [];
  const variants = product.variants ?? [];
  const specifications = product.specifications ?? [];
  const customizations = product.customizations ?? [];
  const images = product.images ?? [];

  const [selection, setSelection] = useState<OptionSelectionState>(() =>
    getInitialSelection(optionGroups),
  );
  const [quoteOpen, setQuoteOpen] = useState(false);

  const selectedVariant = useMemo(
    () => findVariantBySelection(variants, optionGroups, selection),
    [variants, optionGroups, selection],
  );

  const quoteVariantId = useMemo(
    () =>
      resolveQuoteVariantId(
        variants.map((v) => ({ id: v.id, variantStatus: "ACTIVE" })),
        selectedVariant?.id ?? null,
      ),
    [variants, selectedVariant?.id],
  );

  const anchorTabs = useMemo(() => {
    const tabs = [{ id: "mp-pdp-overview", label: "Tổng quan" }];
    if (specifications.length > 0) {
      tabs.push({ id: "mp-pdp-specs", label: "Thông số" });
    }
    if (displayContent || displayShortDescription) {
      tabs.push({ id: "mp-pdp-desc", label: "Mô tả" });
    }
    if (customizations.length > 0) {
      tabs.push({ id: "mp-pdp-custom", label: "Tùy chỉnh" });
    }
    if (showFaqTab) tabs.push({ id: "mp-pdp-faq", label: "FAQ" });
    if (showRelatedTab) tabs.push({ id: "mp-pdp-related", label: "Liên quan" });
    return tabs;
  }, [
    specifications.length,
    customizations.length,
    displayContent,
    displayShortDescription,
    showFaqTab,
    showRelatedTab,
  ]);

  const hasActiveVariants = variants.length > 0;
  const showVariantSelector = optionGroups.length > 0 && hasActiveVariants;

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

    if (!legacyVariant) return images;
    return buildInteractiveGalleryImages(images, [legacyVariant], legacyVariant, true);
  }, [images, selectedVariant]);

  const effectiveMoq = selectedVariant?.moq ?? product.defaultMoq;
  const effectiveLeadTime = selectedVariant?.leadTime ?? product.leadTime;
  const displayedCode = selectedVariant?.sku ?? product.productCode ?? null;
  const stockLabel = selectedVariant
    ? STOCK_LABELS[selectedVariant.stockStatus]
    : variants.length
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
    category: product.category?.name ?? "",
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
                <div className="mp-pdp-overview-meta">
                  <Link href={`/${product.category?.slug ?? ""}`} className="mp-pdp-overview-cat">
                    {product.category?.name ?? "Sản phẩm"}
                  </Link>
                  {displayedCode && (
                    <span className="mp-pdp-overview-code">Mã: {displayedCode}</span>
                  )}
                </div>
                <h1 className="mp-pdp-overview-title">{displayName}</h1>
                {displayShortDescription && (
                  <p className="mp-pdp-overview-summary">{displayShortDescription}</p>
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
                {product.supportsOem && (
                  <div className="mp-pdp-core-fact">
                    <span className="mp-pdp-core-fact-label">OEM</span>
                    <span className="mp-pdp-core-fact-value">Hỗ trợ private label</span>
                  </div>
                )}
              </div>

              {customizations.length > 0 && (
                <div className="mp-pdp-capability-chips" aria-label="Khả năng tùy chỉnh">
                  {customizations.map((item) => (
                    <span key={item.id} className="mp-pdp-capability-chip">
                      {item.label}
                    </span>
                  ))}
                </div>
              )}

              {showVariantSelector && (
                <div className="mp-pdp-options-card product-detail-options">
                  <ProductDynamicOptionSelector
                    optionGroups={optionGroups}
                    variants={variants}
                    selection={selection}
                    onSelect={handleOptionSelect}
                  />
                </div>
              )}

              {optionGroups.length > 0 && !hasActiveVariants && (
                <p className="mp-pdp-no-variants-hint" role="status">
                  Hiện không có phân loại đang bán. Vui lòng liên hệ để được tư vấn và báo giá.
                </p>
              )}

              {specifications.length > 0 && (
                <div className="mp-pdp-spec-preview-wrap">
                  <ProductSpecificationsSection rows={specifications} preview />
                </div>
              )}

              {(displayContent || specifications.length > 0 || customizations.length > 0) && (
                <nav className="mp-pdp-overview-anchors" aria-label="Đi tới mục chi tiết">
                  {specifications.length > 0 && (
                    <a href="#mp-pdp-specs" className="mp-pdp-overview-anchor">
                      Thông số
                    </a>
                  )}
                  {displayContent && (
                    <a href="#mp-pdp-desc" className="mp-pdp-overview-anchor">
                      Mô tả
                    </a>
                  )}
                  {customizations.length > 0 && (
                    <a href="#mp-pdp-custom" className="mp-pdp-overview-anchor">
                      Tùy chỉnh
                    </a>
                  )}
                  {showFaqTab && (
                    <a href="#mp-pdp-faq" className="mp-pdp-overview-anchor">
                      FAQ
                    </a>
                  )}
                </nav>
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
        </div>

        <ProductDetailTabs tabs={anchorTabs} />
      </section>

      {specifications.length > 0 && (
        <ProductSpecificationsSection rows={specifications} />
      )}

      {(displayContent || displayShortDescription) && (
        <section className="mp-section mp-pdp-section" id="mp-pdp-desc">
          <div className="container mp-pdp-desc">
            <header className="mp-pdp-section-head">
              <h2 className="mp-pdp-section-title">Mô tả sản phẩm</h2>
              <p className="mp-pdp-section-subtitle">
                Thông tin chi tiết về chất liệu, ứng dụng và khả năng cung ứng B2B.
              </p>
            </header>
            <div className="mp-pdp-desc-content">
              {displayShortDescription && !displayContent && (
                <p className="mp-pdp-desc-lead">{displayShortDescription}</p>
              )}
              {displayContent && (
                <div className="mp-pdp-desc-body">
                  {displayContent.split("\n\n").map((paragraph) => (
                    <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <ProductCustomizationsSection items={customizations} onRequestQuote={openQuote} />

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
