"use client";

import { Fragment, cloneElement, isValidElement, useCallback, useMemo, useState } from "react";
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
  resolvePdpGalleryImageUrl,
  type OptionSelectionState,
} from "@/lib/productOptionSelection";
import { formatPdpDescriptionContent } from "@/lib/formatPdpDescription";
import { resolveQuoteVariantId } from "@/features/products/product-pdp.utils";
import { mergeGalleryWithVariantImage } from "@/lib/productVariants";
import { getPrimaryProductImage } from "@/lib/productImages";
import {
  buildPdpImageAllowlist,
  filterProductGalleryImages,
} from "@/lib/productImageScope";
import { formatPdpMoqText, isPublicMoq } from "@/lib/formatMoq";
import type { ManufacturingEvidenceItem } from "@/lib/manufacturing-library.types";

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

type CapabilityItem = {
  key: string;
  title: string;
  description: string;
};

type Props = {
  product: PublicProductDetail;
  displayName: string;
  displayShortDescription?: string | null;
  displayContent?: string | null;
  showFaqTab?: boolean;
  showRelatedTab?: boolean;
  manufacturingEvidenceItems?: readonly ManufacturingEvidenceItem[];
};

export default function ProductDetailInteractive({
  product,
  displayName,
  displayShortDescription,
  displayContent,
  showFaqTab = true,
  showRelatedTab = false,
  manufacturingEvidenceItems,
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
    const tabs: { id: string; label: string }[] = [];
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

  const productImageUrls = useMemo(
    () =>
      buildPdpImageAllowlist({
        images,
        variantImageUrls: variants.map((variant) => variant.imageUrl),
        optionValueImageUrls: optionGroups.flatMap((group) =>
          group.values.map((value) => value.imageUrl),
        ),
      }),
    [images, variants, optionGroups],
  );

  const primaryImageUrl = useMemo(() => getPrimaryProductImage(images), [images]);

  const displayImageUrl = useMemo(
    () =>
      resolvePdpGalleryImageUrl(
        variants,
        optionGroups,
        selection,
        productImageUrls,
        primaryImageUrl,
      ),
    [variants, optionGroups, selection, productImageUrls, primaryImageUrl],
  );

  const galleryImages = useMemo(() => {
    const base = filterProductGalleryImages(images, productImageUrls);
    if (displayImageUrl) {
      return mergeGalleryWithVariantImage(base, displayImageUrl, productImageUrls);
    }
    return base;
  }, [images, displayImageUrl, productImageUrls]);

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

  const variantSummary = useMemo(() => {
    if (!variants.length) return null;
    const colorValues = new Set<string>();
    const sizeValues = new Set<string>();
    for (const variant of variants) {
      if (variant.colorName) colorValues.add(variant.colorName);
      if (variant.sizeName) sizeValues.add(variant.sizeName);
    }
    return [
      `${variants.length} biến thể`,
      colorValues.size > 0 ? `${colorValues.size} màu` : null,
      sizeValues.size > 0 ? `${sizeValues.size} size` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [variants]);

  const capabilityItems = useMemo<CapabilityItem[]>(() => {
    const items: CapabilityItem[] = [];
    if (product.supportsPrinting) {
      items.push({
        key: "printing",
        title: "In logo",
        description: "Tư vấn kỹ thuật in phù hợp chất liệu và số lượng.",
      });
    }
    if (product.supportsEmbroidery) {
      items.push({
        key: "embroidery",
        title: "Thêu logo",
        description: "Phù hợp đồng phục cần độ bền và cảm giác cao cấp.",
      });
    }
    if (product.supportsOem) {
      items.push({
        key: "oem",
        title: "OEM/private label",
        description: "Hỗ trợ phát triển sản phẩm theo nhận diện thương hiệu.",
      });
    }
    items.push({
      key: "tiered-quote",
      title: "Báo giá theo số lượng",
      description: "Báo giá theo MOQ, tiến độ và yêu cầu hoàn thiện.",
    });
    return items.slice(0, 4);
  }, [product.supportsEmbroidery, product.supportsOem, product.supportsPrinting]);

  const descriptionContentBlocks = useMemo(() => {
    if (!displayContent) return [];

    const blockKeys = displayContent
      .split("\n\n")
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block, index) => `${index}-${block.slice(0, 80)}`);

    return formatPdpDescriptionContent(displayContent).map((node, index) => {
      const key = blockKeys[index] ?? `description-block-${index}`;
      if (isValidElement(node)) {
        return cloneElement(node, { key });
      }
      return <Fragment key={key}>{node}</Fragment>;
    });
  }, [displayContent]);

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
    imageUrl: displayImageUrl ?? galleryImages[0]?.imageUrl ?? null,
    moq: effectiveMoq,
    leadTime: effectiveLeadTime,
    variantId: quoteVariantId,
    variantLabel: selectedVariant?.id === quoteVariantId ? selectedVariant?.label ?? null : null,
    variantSku: selectedVariant?.id === quoteVariantId ? selectedVariant?.sku ?? null : null,
    optionSelections: selectedVariant?.optionSelections ?? selection,
  };

  const conversionPanel = (
    <ProductPdpConversionPanel
      productName={displayName}
      productCode={displayedCode}
      variantLabel={selectedVariant?.label}
      moq={effectiveMoq}
      leadTime={effectiveLeadTime}
      stockLabel={stockLabel}
      stockColor={stockColor}
      onRequestQuote={openQuote}
      manufacturingEvidenceItems={manufacturingEvidenceItems}
    />
  );

  return (
    <>
      <div className="mp-pdp-shell">
        <div className="container">
          <div className="mp-pdp-sticky-layout">
            <div className="mp-pdp-sticky-layout__cluster">
              <div className="mp-pdp-shell-hero">
                <div className="product-detail-left" id="mp-pdp-overview">
                  <ProductGallery
                    images={galleryImages}
                    productName={displayName}
                    selectedImageUrl={displayImageUrl}
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
                  </div>

                  {capabilityItems.length > 0 && (
                    <div className="mp-pdp-capability-block" aria-label="Khả năng B2B">
                      {capabilityItems.map((item) => (
                        <div key={item.key} className="mp-pdp-capability-item">
                          <strong>{item.title}</strong>
                          <span>{item.description}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {showVariantSelector && (
                    <div className="mp-pdp-options-card product-detail-options">
                      <div className="mp-pdp-options-head">
                        <h2 className="mp-pdp-options-title">Tùy chọn sản phẩm</h2>
                        {variantSummary && (
                          <p className="mp-pdp-options-summary">{variantSummary}</p>
                        )}
                      </div>
                      <ProductDynamicOptionSelector
                        optionGroups={optionGroups}
                        variants={variants}
                        selection={selection}
                        onSelect={handleOptionSelect}
                        allowedImageUrls={productImageUrls}
                      />
                    </div>
                  )}

                  {optionGroups.length > 0 && !hasActiveVariants && (
                    <p className="mp-pdp-no-variants-hint" role="status">
                      Hiện không có phân loại đang bán. Vui lòng liên hệ để được tư vấn và báo giá.
                    </p>
                  )}

                  {specifications.length > 0 && (
                    <div className="mp-pdp-spec-below-options">
                      <ProductSpecificationsSection rows={specifications} preview />
                    </div>
                  )}
                </div>
              </div>

              <div className="mp-pdp-shell-content">
                <ProductDetailTabs tabs={anchorTabs} />

                {specifications.length > 0 && (
                  <ProductSpecificationsSection rows={specifications} />
                )}

                {(displayContent || displayShortDescription) && (
                  <section className="mp-section mp-pdp-section" id="mp-pdp-desc">
                    <div className="mp-pdp-desc">
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
                            {descriptionContentBlocks}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                <ProductCustomizationsSection items={customizations} onRequestQuote={openQuote} />
              </div>
            </div>

            <div className="mp-pdp-sticky-layout__aside">{conversionPanel}</div>
          </div>
        </div>
      </div>

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
