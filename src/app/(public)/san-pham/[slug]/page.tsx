import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug, getRelatedProducts } from "@/features/products/services/product.service";
import ProductCard from "@/components/public/ProductCard";
import ProductImageGallery from "@/components/public/ProductImageGallery";
import StickyInquiryBox from "@/components/public/StickyInquiryBox";
import ProductFaqList from "@/components/public/ProductFaqList";
import TrustBlock from "@/components/public/TrustBlock";
import EmptyState from "@/components/public/EmptyState";
import Breadcrumb from "@/components/seo/Breadcrumb";
import FaqSchema from "@/components/seo/FaqSchema";
import {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  canonicalUrl,
  buildOgImages,
} from "@/lib/seo";
import {
  buildProductImages,
  getPrimaryProductImageFromProduct,
} from "@/lib/productImages";
import {
  getCatalogProduct,
  isCatalogProduct,
  getCatalogInternalLinks,
} from "@/lib/productCatalog";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const catalog = getCatalogProduct(slug);
  const product = await getProductBySlug(slug);
  if (!product && !catalog) return {};

  const title =
    catalog?.seoTitle ??
    product?.seoTitle ??
    `${catalog?.name ?? product?.name} | ${SITE_NAME}`;
  const description =
    catalog?.seoDescription ??
    product?.seoDescription ??
    catalog?.shortDescription ??
    product?.shortDescription ??
    product?.description ??
    DEFAULT_DESCRIPTION;

  const primaryImage = product ? getPrimaryProductImageFromProduct(product) : null;
  const ogImages = buildOgImages(primaryImage ?? product?.images[0]?.imageUrl);

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl(`/san-pham/${slug}`) },
    openGraph: {
      title: catalog?.seoTitle ?? product?.seoTitle ?? catalog?.name ?? product?.name,
      description,
      url: canonicalUrl(`/san-pham/${slug}`),
      siteName: SITE_NAME,
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: catalog?.seoTitle ?? product?.seoTitle ?? catalog?.name ?? product?.name,
      description,
      images: ogImages,
    },
  };
}

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
const STOCK_STATUS_LABEL: Record<string, string> = {
  IN_STOCK: "Còn hàng",
  LOW_STOCK: "Sắp hết",
  OUT_OF_STOCK: "Hết hàng",
};

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const catalog = getCatalogProduct(slug);
  const product = await getProductBySlug(slug);
  if (!product && !catalog) notFound();
  if (!product) notFound();

  const displayName = catalog?.name ?? product.name;
  const displayShortDescription = catalog?.shortDescription ?? product.shortDescription;
  const displayContent = catalog?.content ?? product.description;
  const categoryName = catalog?.categoryName ?? product.category.name;
  const categorySlug = catalog?.categorySlug ?? product.category.slug;

  // Unified image list (legacy ProductImage + new featuredImage/gallery)
  const unifiedImages = buildProductImages(product);

  const relatedProducts = await getRelatedProducts(product.category.id, product.id, 4);

  const uniqueColors = [
    ...new Set(
      product.variants
        .map((v) => v.colorName ?? v.color?.name)
        .filter((c): c is string => Boolean(c))
    ),
  ];
  const uniqueSizes = [
    ...new Set(
      product.variants
        .map((v) => v.sizeName ?? v.size?.name)
        .filter((s): s is string => Boolean(s))
    ),
  ];
  const skuCount = product.variants.length;

  const stockStatuses = product.variants.map((v) => v.stockStatus);
  const aggregateStock =
    stockStatuses.length === 0
      ? null
      : stockStatuses.includes("IN_STOCK")
      ? "IN_STOCK"
      : stockStatuses.includes("LOW_STOCK")
      ? "LOW_STOCK"
      : "OUT_OF_STOCK";

  const stockLabel = aggregateStock ? STOCK_LABELS[aggregateStock] : null;
  const stockColor = aggregateStock ? STOCK_COLORS[aggregateStock] : "#16a34a";

  const hasSpecs = !isCatalogProduct(slug) && (product.material || product.form || product.fit);
  const hasB2bInfo = product.defaultMoq || product.leadTime || skuCount > 0 || uniqueColors.length > 0;
  const hasFeatures = product.supportsPrinting || product.supportsEmbroidery || product.supportsOem;
  const hasUseCases = Array.isArray(product.useCases) && (product.useCases as string[]).length > 0;
  const hasTargetCustomers = Array.isArray(product.targetCustomers) && (product.targetCustomers as string[]).length > 0;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayName,
    description:
      catalog?.seoDescription ??
      displayShortDescription ??
      displayContent ??
      product.seoDescription ??
      product.shortDescription ??
      product.description ??
      DEFAULT_DESCRIPTION,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: categoryName,
    ...((catalog?.sku ?? product.productCode) && {
      sku: catalog?.sku ?? product.productCode,
    }),
    ...(unifiedImages.length > 0 && {
      image: unifiedImages.map((img) => img.imageUrl),
    }),
    url: canonicalUrl(`/san-pham/${slug}`),
  };

  const faqItems = catalog?.faqs ?? [
    {
      question: "Sản phẩm có nhận in logo không?",
      answer: product.supportsPrinting
        ? "Có. Sản phẩm này hỗ trợ in logo theo yêu cầu."
        : "Liên hệ ATTD để được tư vấn kỹ thuật in phù hợp.",
    },
    {
      question: "Số lượng tối thiểu (MOQ) là bao nhiêu?",
      answer: product.defaultMoq
        ? `MOQ là ${product.defaultMoq} cái. Liên hệ để biết chính sách ưu đãi theo số lượng.`
        : "Liên hệ ATTD để được tư vấn MOQ theo từng dòng sản phẩm.",
    },
    {
      question: "Thời gian giao hàng là bao lâu?",
      answer: product.leadTime
        ? product.leadTime
        : "Hàng có sẵn kho giao trong 1–3 ngày. Đặt hàng số lượng lớn hoặc gia công theo yêu cầu: 5–20 ngày.",
    },
    {
      question: "Có hỗ trợ giao hàng toàn quốc không?",
      answer: "Có. ATTD giao hàng toàn quốc qua đơn vị vận chuyển đối tác.",
    },
  ];

  const internalLinks = catalog
    ? getCatalogInternalLinks(catalog.categorySlug)
    : [
        { href: "/nguon-hang", label: "Nguồn hàng sỉ" },
        { href: "/chinh-sach-dai-ly", label: "Chính sách đại lý" },
        { href: "/oem", label: "OEM & Private Label" },
        { href: "/qua-tang-doanh-nghiep", label: "Quà tặng DN" },
      ];

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <FaqSchema items={faqItems} />

      <Breadcrumb
        items={[
          { name: "Sản phẩm", href: "/san-pham" },
          { name: categoryName, href: `/${categorySlug}` },
          { name: displayName, href: `/san-pham/${slug}` },
        ]}
      />

      {/* ── Product Hero ─────────────────────────────────────────────────── */}
      <section className="section-compact">
        <div className="container">
          <div className="product-detail-layout">
            {/* Left: Gallery */}
            <div className="product-detail-gallery">
              <ProductImageGallery
                images={unifiedImages}
                productName={displayName}
              />
            </div>

            {/* Right: Info */}
            <div className="product-detail-info">
              {/* Category + code */}
              <div className="product-detail-meta">
                {(catalog?.sku ?? product.productCode) && (
                  <span className="product-meta-pill">
                    {catalog?.sku ?? product.productCode}
                  </span>
                )}
                <Link href={`/${categorySlug}`} className="product-detail-cat-link">
                  {categoryName}
                </Link>
              </div>

              <h1 className="product-detail-title">{displayName}</h1>

              {displayShortDescription && (
                <p className="product-detail-short-desc">{displayShortDescription}</p>
              )}

              {/* Specs table */}
              {hasSpecs && (
                <div className="product-specs-card">
                  <dl className="product-specs-dl">
                    {product.material && (
                      <>
                        <dt>Chất liệu</dt>
                        <dd>{product.material}</dd>
                      </>
                    )}
                    {product.form && (
                      <>
                        <dt>Kiểu dáng</dt>
                        <dd>{product.form}</dd>
                      </>
                    )}
                    {product.fit && (
                      <>
                        <dt>Form</dt>
                        <dd>{product.fit}</dd>
                      </>
                    )}
                    {product.gsm && (
                      <>
                        <dt>GSM</dt>
                        <dd>{product.gsm} gsm</dd>
                      </>
                    )}
                  </dl>
                </div>
              )}

              {/* B2B summary strip */}
              {hasB2bInfo && (
                <div className="product-b2b-strip">
                  {skuCount > 0 && (
                    <div className="product-b2b-item">
                      <span className="product-b2b-value">{skuCount}</span>
                      <span className="product-b2b-label">SKU</span>
                    </div>
                  )}
                  {uniqueColors.length > 0 && (
                    <div className="product-b2b-item">
                      <span className="product-b2b-value">{uniqueColors.length}</span>
                      <span className="product-b2b-label">Màu sắc</span>
                    </div>
                  )}
                  {product.defaultMoq != null && (
                    <div className="product-b2b-item">
                      <span className="product-b2b-value">{product.defaultMoq}</span>
                      <span className="product-b2b-label">MOQ (cái)</span>
                    </div>
                  )}
                  {product.leadTime && (
                    <div className="product-b2b-item">
                      <span className="product-b2b-value" style={{ fontSize: 13 }}>{product.leadTime}</span>
                      <span className="product-b2b-label">Giao hàng</span>
                    </div>
                  )}
                </div>
              )}

              {/* Feature support badges */}
              {hasFeatures && (
                <div className="product-feature-badges">
                  {product.supportsPrinting && (
                    <span className="product-feature-badge">✓ In logo</span>
                  )}
                  {product.supportsEmbroidery && (
                    <span className="product-feature-badge">✓ Thêu vi tính</span>
                  )}
                  {product.supportsOem && (
                    <span className="product-feature-badge product-feature-badge--oem">✓ OEM / Private Label</span>
                  )}
                </div>
              )}

              <StickyInquiryBox
                stockLabel={stockLabel}
                stockColor={stockColor}
                internalLinks={internalLinks}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Variants Table ───────────────────────────────────────────────── */}
      {product.variants.length > 0 && (
        <section className="section-alt section-compact">
          <div className="container" style={{ maxWidth: 900 }}>
            <h2 className="product-section-title">Biến thể & SKU</h2>
            <p className="product-section-desc">
              Giá sỉ theo từng biến thể — liên hệ ATTD để nhận báo giá chi
              tiết theo số lượng và yêu cầu gia công.
            </p>
            <div className="product-variant-table-wrap">
              <table className="product-variant-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Màu sắc</th>
                    <th>Size / Dung tích / Kích thước</th>
                    <th>Tình trạng</th>
                    <th>Giá</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((v) => {
                    const sizeInfo = v.sizeName ?? v.size?.name ?? v.capacity ?? v.dimensions;
                    const colorInfo = v.colorName ?? v.color?.name;
                    const statusLabel = STOCK_STATUS_LABEL[v.stockStatus] ?? "—";
                    const statusColor = STOCK_COLORS[v.stockStatus] ?? "#6b7280";
                    return (
                      <tr key={v.id}>
                        <td><code className="product-sku-code">{v.sku}</code></td>
                        <td>
                          {colorInfo ? (
                            <span className="product-variant-color">
                              {v.colorCode && (
                                <span
                                  className="product-color-dot"
                                  style={{ background: v.colorCode.startsWith("#") ? v.colorCode : undefined }}
                                />
                              )}
                              {colorInfo}
                            </span>
                          ) : "—"}
                        </td>
                        <td>{sizeInfo ?? "—"}</td>
                        <td>
                          <span className="product-stock-chip" style={{ color: statusColor, borderColor: statusColor }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="product-variant-price">Liên hệ</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── B2B Specs ────────────────────────────────────────────────────── */}
      {(hasUseCases || hasTargetCustomers || hasFeatures) && (
        <section className="section-compact">
          <div className="container" style={{ maxWidth: 900 }}>
            <h2 className="product-section-title">Thông tin B2B & Ứng dụng</h2>
            <div className="product-b2b-spec-grid">
              {hasUseCases && (
                <div className="product-b2b-spec-block">
                  <h3 className="product-b2b-spec-heading">Ứng dụng phổ biến</h3>
                  <ul className="product-b2b-spec-list">
                    {(product.useCases as string[]).map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                </div>
              )}
              {hasTargetCustomers && (
                <div className="product-b2b-spec-block">
                  <h3 className="product-b2b-spec-heading">Đối tượng phù hợp</h3>
                  <ul className="product-b2b-spec-list">
                    {(product.targetCustomers as string[]).map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {hasFeatures && (
                <div className="product-b2b-spec-block">
                  <h3 className="product-b2b-spec-heading">Hỗ trợ gia công</h3>
                  <ul className="product-b2b-spec-list">
                    {product.supportsPrinting && <li>✓ In logo (silk-screen / DTG / chuyển nhiệt)</li>}
                    {product.supportsEmbroidery && <li>✓ Thêu vi tính</li>}
                    {product.supportsOem && <li>✓ OEM / Private Label</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Product Description ───────────────────────────────────────────── */}
      <section className="section-alt section-compact">
        <div className="container" style={{ maxWidth: 760 }}>
          <h2 className="product-section-title">Mô tả sản phẩm</h2>

          {displayContent || displayShortDescription ? (
            <>
              {displayShortDescription && (
                <p className="product-desc-lead">{displayShortDescription}</p>
              )}
              {displayContent && (
                <div className="product-desc-body">{displayContent}</div>
              )}
            </>
          ) : (
            <EmptyState
              title="Thông tin sản phẩm đang được cập nhật"
              description="Liên hệ ATTD để nhận báo giá và tư vấn chi tiết về sản phẩm này."
            />
          )}
        </div>
      </section>

      <section className="section-compact">
        <div className="container" style={{ maxWidth: 760 }}>
          <TrustBlock />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="section-alt section-compact">
        <div className="container" style={{ maxWidth: 760 }}>
          <h2 className="product-section-title">Hỏi đáp thường gặp</h2>
          <ProductFaqList items={faqItems} />
        </div>
      </section>

      {/* ── Related Products ─────────────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <section className="section-compact">
          <div className="container">
            <h2 className="product-section-title">Sản phẩm liên quan</h2>
            <div className="product-related-grid">
              {relatedProducts.map((related) => (
                <ProductCard
                  key={related.id}
                  id={related.id}
                  slug={related.slug}
                  name={related.name}
                  skuCount={related.variants.length}
                  category={categoryName}
                  imageUrl={getPrimaryProductImageFromProduct(related)}
                  moq={related.defaultMoq}
                  leadTime={related.leadTime}
                  supportsPrinting={related.supportsPrinting}
                  supportsEmbroidery={related.supportsEmbroidery}
                  supportsOem={related.supportsOem}
                />
              ))}
            </div>
            <div style={{ marginTop: 28 }}>
              <Link href={`/${categorySlug}`} className="link-chip">
                Xem tất cả {categoryName}
                <span aria-hidden style={{ color: "#9ca3af" }}>→</span>
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
