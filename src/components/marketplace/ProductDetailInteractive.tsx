"use client";

import { Fragment, cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProductGallery from "@/components/marketplace/ProductGallery";
import ProductDynamicOptionSelector from "@/components/marketplace/ProductDynamicOptionSelector";
import ProductPdpConversionPanel, {
  ProductPdpCapabilityGrid,
  type ProductPdpCapability,
} from "@/components/marketplace/ProductPdpConversionPanel";
import ProductPdpMobileBar from "@/components/marketplace/ProductPdpMobileBar";
import ProductSpecificationsSection from "@/components/marketplace/ProductSpecificationsSection";
import ProductCustomizationsSection from "@/components/marketplace/ProductCustomizationsSection";
import ProductDetailTabs from "@/components/marketplace/ProductDetailTabs";
import ProductSizeChartSection from "@/components/marketplace/ProductSizeChartSection";
import ProductQuoteDialog from "@/components/public/ProductQuoteDialog";
import type { PublicProductDetail } from "@/features/products/product-detail.types";
import {
  findVariantBySelection,
  getInitialSelection,
  resolvePdpGalleryImageUrl,
  type OptionSelectionState,
} from "@/lib/productOptionSelection";
import { formatPdpDescriptionContent } from "@/lib/formatPdpDescription";
import ProductDescriptionBlocks from "@/components/marketplace/ProductDescriptionBlocks";
import { hasVisibleDescriptionBlocks } from "@/features/products/product-description-blocks";
import { resolveQuoteVariantId } from "@/features/products/product-pdp.utils";
import { mergeGalleryWithVariantImage } from "@/lib/productVariants";
import { getPrimaryProductImage } from "@/lib/productImages";
import {
  buildPdpImageAllowlist,
  filterProductGalleryImages,
} from "@/lib/productImageScope";
import { formatPdpMoqText, isPublicMoq } from "@/lib/formatMoq";
import type { ManufacturingEvidenceItem } from "@/lib/manufacturing-library.types";
import ManufacturingGallery from "@/components/public/manufacturing/ManufacturingGallery";
import { trackPdpOptionsChanged, trackPdpQuoteClicked } from "@/lib/analytics";

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

function buildSelectedOptionEntries(
  optionGroups: PublicProductDetail["optionGroups"],
  selection: OptionSelectionState,
) {
  return optionGroups
    .map((group) => {
      const value = selection[group.slug];
      if (!value) return null;
      return {
        label: group.name,
        value,
      };
    })
    .filter((entry): entry is { label: string; value: string } => Boolean(entry));
}

const DEFAULT_PDP_CAPABILITIES: ProductPdpCapability[] = [
  {
    key: "default-printing",
    title: "In logo",
    description: "Tư vấn kỹ thuật in phù hợp chất liệu và số lượng.",
  },
  {
    key: "default-embroidery",
    title: "Thêu logo",
    description: "Phù hợp đồng phục cần độ bền và cảm giác cao cấp.",
  },
  {
    key: "default-oem",
    title: "OEM / Private Label",
    description: "Hỗ trợ phát triển sản phẩm theo nhận diện thương hiệu.",
  },
  {
    key: "default-tiered-quote",
    title: "Báo giá theo số lượng",
    description: "Báo giá theo MOQ, tiến độ và yêu cầu hoàn thiện.",
  },
];

function normalizeCapabilityTitle(label: string) {
  const trimmed = label.trim();
  if (/^in logo\s*\/\s*in hình$/i.test(trimmed)) return "In logo";
  if (/^oem\s*\/\s*private label$/i.test(trimmed)) return "OEM / Private Label";
  return trimmed;
}

function resolveCapabilityDescription(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("thêu")) {
    return "Phù hợp đồng phục cần độ bền và cảm giác cao cấp.";
  }
  if (normalized.includes("oem") || normalized.includes("private") || normalized.includes("label")) {
    return "Hỗ trợ phát triển sản phẩm theo nhận diện thương hiệu.";
  }
  if (normalized.includes("giá") || normalized.includes("moq") || normalized.includes("số lượng")) {
    return "Báo giá theo MOQ, tiến độ và yêu cầu hoàn thiện.";
  }
  if (normalized.includes("in") || normalized.includes("logo")) {
    return "Tư vấn kỹ thuật in phù hợp chất liệu và số lượng.";
  }
  return null;
}

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
  const sizeChart = product.sizeChart;

  const [selection, setSelection] = useState<OptionSelectionState>(() =>
    getInitialSelection(optionGroups),
  );
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteCtaAttentionKey, setQuoteCtaAttentionKey] = useState(0);

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

  const richDescriptionBlocks = product.descriptionBlocks;
  const hasRichDescription = hasVisibleDescriptionBlocks(richDescriptionBlocks);
  const showDescriptionSection =
    hasRichDescription || Boolean(displayContent) || Boolean(displayShortDescription);

  const anchorTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [];
    if (specifications.length > 0) {
      tabs.push({ id: "mp-pdp-specs", label: "Thông số" });
    }
    if (sizeChart) {
      tabs.push({ id: "mp-pdp-size-chart", label: "Bảng size" });
    }
    if (showDescriptionSection) {
      tabs.push({ id: "mp-pdp-desc", label: "Mô tả" });
    }
    if (customizations.length > 0) {
      tabs.push({ id: "mp-pdp-custom", label: "Tùy chỉnh" });
    }
    if (showFaqTab) tabs.push({ id: "mp-pdp-faq", label: "Hỏi đáp" });
    if (showRelatedTab) tabs.push({ id: "mp-pdp-related", label: "Liên quan" });
    return tabs;
  }, [
    specifications.length,
    sizeChart,
    customizations.length,
    showDescriptionSection,
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
  const hasCoreFacts = isPublicMoq(effectiveMoq) || Boolean(effectiveLeadTime);
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

  const selectedOptionEntries = useMemo(
    () => buildSelectedOptionEntries(optionGroups, selection),
    [optionGroups, selection],
  );
  const selectedOptionSummary = selectedOptionEntries.length
    ? selectedOptionEntries.map((entry) => `${entry.label}: ${entry.value}`).join(" · ")
    : null;

  const capabilityItems = useMemo<ProductPdpCapability[]>(() => {
    const storedCapabilities = product.customizations.filter((item) => !item.id.startsWith("flag-"));
    const productCapabilities = storedCapabilities
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        key: item.id,
        title: normalizeCapabilityTitle(item.label),
        description:
          item.description?.trim() ||
          resolveCapabilityDescription(item.label) ||
          "ATTD tư vấn phương án phù hợp chất liệu, số lượng và mục tiêu sử dụng.",
      }))
      .filter((item) => item.title.trim());

    return (productCapabilities.length > 0 ? productCapabilities : DEFAULT_PDP_CAPABILITIES).slice(0, 4);
  }, [product.customizations]);

  const descriptionContentBlocks = useMemo(() => {
    if (hasRichDescription || !displayContent) return [];

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
  }, [displayContent, hasRichDescription]);

  const handleOptionSelect = useCallback((groupSlug: string, valueLabel: string) => {
    if (selection[groupSlug] === valueLabel) return;
    const nextSelection = { ...selection, [groupSlug]: valueLabel };
    const nextVariant = findVariantBySelection(variants, optionGroups, nextSelection);
    setSelection(nextSelection);
    if (nextVariant) {
      setQuoteCtaAttentionKey((key) => key + 1);
    }
  }, [optionGroups, selection, variants]);

  const skipInitialOptionsTrackingRef = useRef(true);
  useEffect(() => {
    if (skipInitialOptionsTrackingRef.current) {
      skipInitialOptionsTrackingRef.current = false;
      return;
    }
    const entries = buildSelectedOptionEntries(optionGroups, selection);
    if (!entries.length) return;
    trackPdpOptionsChanged({
      product_id: product.id,
      product_slug: product.slug,
      option_summary: entries.map((entry) => `${entry.label}: ${entry.value}`).join(" · "),
    });
  }, [selection, optionGroups, product.id, product.slug]);

  const openQuote = useCallback(
    (source: string) => {
      trackPdpQuoteClicked({
        product_id: product.id,
        product_slug: product.slug,
        source,
      });
      setQuoteOpen(true);
    },
    [product.id, product.slug],
  );
  const openQuoteFromPanel = useCallback(() => openQuote("pdp_conversion_panel"), [openQuote]);
  const openQuoteFromMobile = useCallback(() => openQuote("pdp_mobile_bar"), [openQuote]);
  const openQuoteFromCustomizations = useCallback(
    () => openQuote("pdp_customizations"),
    [openQuote],
  );
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
    optionSummary: selectedOptionSummary,
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
      optionSummary={selectedOptionSummary}
      capabilities={capabilityItems}
      onRequestQuote={openQuoteFromPanel}
      showFacts={false}
      showCapabilities={false}
      className="mp-pdp-hero-conversion"
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

                <div className="product-detail-center mp-pdp-hero-summary">
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
                </div>

                {hasCoreFacts && (
                  <div className="mp-pdp-core-facts mp-pdp-hero-facts">
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
                    <div
                      className={[
                        "mp-pdp-option-quote-feedback",
                        selectedOptionSummary ? "mp-pdp-option-quote-feedback--selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      role="status"
                      aria-live="polite"
                    >
                      {selectedOptionSummary ? (
                        <>
                          <span>Đã thêm vào yêu cầu báo giá</span>
                          <strong>Đang chọn: {selectedOptionSummary}</strong>
                        </>
                      ) : (
                        <span>Chọn màu/size để ATTD tư vấn báo giá chính xác hơn.</span>
                      )}
                    </div>
                  </div>
                )}

                {optionGroups.length > 0 && !hasActiveVariants && (
                  <p className="mp-pdp-no-variants-hint" role="status">
                    Hiện không có phân loại đang bán. Vui lòng liên hệ để được tư vấn và báo giá.
                  </p>
                )}

                <ProductPdpCapabilityGrid
                  capabilities={capabilityItems}
                  className="mp-pdp-hero-capabilities"
                />

                {conversionPanel}

                {specifications.length > 0 && (
                  <div className="mp-pdp-spec-below-options">
                    <ProductSpecificationsSection rows={specifications} preview />
                  </div>
                )}
              </div>

              <div className="mp-pdp-shell-content">
                <ProductDetailTabs tabs={anchorTabs} />

                {specifications.length > 0 && (
                  <ProductSpecificationsSection rows={specifications} />
                )}

                <ProductSizeChartSection chart={sizeChart} />

                {showDescriptionSection && (
                  <section className="mp-section mp-pdp-section" id="mp-pdp-desc">
                    <div className="mp-pdp-desc">
                      <header className="mp-pdp-section-head">
                        <h2 className="mp-pdp-section-title">Mô tả sản phẩm</h2>
                        <p className="mp-pdp-section-subtitle">
                          Thông tin chi tiết về chất liệu, ứng dụng và khả năng cung ứng B2B.
                        </p>
                      </header>
                      <div className="mp-pdp-desc-content">
                        {hasRichDescription ? (
                          <div className="mp-pdp-desc-body">
                            <ProductDescriptionBlocks blocks={richDescriptionBlocks} />
                          </div>
                        ) : (
                          <>
                            {displayShortDescription && !displayContent && (
                              <p className="mp-pdp-desc-lead">{displayShortDescription}</p>
                            )}
                            {displayContent && (
                              <div className="mp-pdp-desc-body">
                                {descriptionContentBlocks}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                <ProductCustomizationsSection items={customizations} onRequestQuote={openQuoteFromCustomizations} />

                <ManufacturingGallery
                  title="Quy trình sản xuất"
                  items={manufacturingEvidenceItems ?? []}
                  layout="mosaic"
                  className="mp-pdp-section mp-pdp-factory-gallery"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProductPdpMobileBar
        productSlug={product.slug}
        onRequestQuote={openQuoteFromMobile}
        attentionKey={quoteCtaAttentionKey}
        isQuoteReady={Boolean(selectedVariant)}
      />

      <ProductQuoteDialog
        open={quoteOpen}
        onClose={closeQuote}
        product={quoteContext}
        restoreFocusRef={{ current: null }}
      />
    </>
  );
}
