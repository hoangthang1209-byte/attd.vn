import { notFound } from "next/navigation";
import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import type { Metadata } from "next";
import { getProductBySlug, getRelatedProducts } from "@/features/products/services/product.service";
import ProductImageGallery from "@/components/public/ProductImageGallery";
import Breadcrumb from "@/components/seo/Breadcrumb";
import FaqSchema from "@/components/seo/FaqSchema";
import {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  canonicalUrl,
  buildOgImages,
} from "@/lib/seo";
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
  const ogImages = buildOgImages(product?.images[0]?.imageUrl);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl(`/san-pham/${slug}`),
    },
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

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const catalog = getCatalogProduct(slug);
  const product = await getProductBySlug(slug);
  if (!product && !catalog) notFound();
  if (!product) notFound();

  const displayName = catalog?.name ?? product.name;
  const displayShortDescription =
    catalog?.shortDescription ?? product.shortDescription;
  const displayContent = catalog?.content ?? product.description;
  const categoryName = catalog?.categoryName ?? product.category.name;
  const categorySlug = catalog?.categorySlug ?? product.category.slug;

  // Fetch related products in parallel (non-blocking)
  const relatedProducts = await getRelatedProducts(
    product.category.id,
    product.id,
    4
  );

  const uniqueColors = [
    ...new Set(
      product.variants
        .map((v) => v.color?.name)
        .filter((c): c is string => Boolean(c))
    ),
  ];

  const uniqueSizes = [
    ...new Set(
      product.variants
        .map((v) => v.size?.name)
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

  const stockLabel =
    aggregateStock === "IN_STOCK"
      ? "Còn hàng"
      : aggregateStock === "LOW_STOCK"
      ? "Sắp hết hàng"
      : aggregateStock === "OUT_OF_STOCK"
      ? "Hết hàng"
      : null;

  const stockColor =
    aggregateStock === "IN_STOCK"
      ? "#16a34a"
      : aggregateStock === "LOW_STOCK"
      ? "#d97706"
      : "#dc2626";

  const hasSpecs =
    !isCatalogProduct(slug) &&
    (product.gsm || product.material || product.fit);

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
    ...(product.images.length > 0 && {
      image: product.images.map((img) => img.imageUrl),
    }),
    url: canonicalUrl(`/san-pham/${slug}`),
  };

  const legacyFaqItems = [
    {
      question: "Sản phẩm có nhận in logo không?",
      answer: "Có. ATTD hỗ trợ in logo theo yêu cầu.",
    },
    {
      question: "Số lượng tối thiểu là bao nhiêu?",
      answer: "Liên hệ để được tư vấn theo từng dòng sản phẩm.",
    },
    {
      question: "Có hỗ trợ gửi mẫu không?",
      answer: "Có thể hỗ trợ gửi mẫu tùy sản phẩm.",
    },
  ];

  const faqItems = catalog?.faqs ?? legacyFaqItems;

  const legacyInternalLinks = [
    { href: "/nguon-hang", label: "Nguồn hàng sỉ" },
    { href: "/chinh-sach-dai-ly", label: "Chính sách đại lý" },
    { href: "/oem", label: "OEM & Private Label" },
    { href: "/qua-tang-doanh-nghiep", label: "Quà tặng DN" },
  ];

  const internalLinks = catalog
    ? getCatalogInternalLinks(catalog.categorySlug)
    : legacyInternalLinks;

  return (
    <main>
      {/* ── Structured Data ──────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <FaqSchema items={faqItems} />

      {/* ── Breadcrumb (visual + BreadcrumbList JSON-LD) ─────────────────── */}
      <Breadcrumb
        items={[
          { name: categoryName, href: `/${categorySlug}` },
          { name: displayName, href: `/san-pham/${slug}` },
        ]}
      />

      {/* ── Product Hero ─────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ gap: "48px" }}
          >
            {/* Image column */}
            <ProductImageGallery
              images={product.images}
              productName={displayName}
            />

            {/* Info column */}
            <div>
              {/* Product code + category */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                }}
              >
                {(catalog?.sku ?? product.productCode) && (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#6b7280",
                      background: "#f3f4f6",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {catalog?.sku ?? product.productCode}
                  </span>
                )}
                <Link
                  href={`/${categorySlug}`}
                  style={{ fontSize: "14px", color: "#6b7280" }}
                >
                  {categoryName}
                </Link>
              </div>

              <h1
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  margin: "0 0 16px",
                }}
              >
                {displayName}
              </h1>

              {displayShortDescription && (
                <p
                  style={{
                    color: "#6b7280",
                    lineHeight: 1.7,
                    margin: "0 0 24px",
                  }}
                >
                  {displayShortDescription}
                </p>
              )}

              {/* Specs */}
              {hasSpecs && (
                <div
                  className="card"
                  style={{ marginBottom: "24px", padding: "16px" }}
                >
                  <dl
                    style={{
                      margin: 0,
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: "8px 20px",
                      alignItems: "baseline",
                    }}
                  >
                    {product.gsm && (
                      <>
                        <dt style={{ color: "#6b7280", fontSize: "14px", whiteSpace: "nowrap" }}>
                          GSM
                        </dt>
                        <dd style={{ margin: 0, fontWeight: 500 }}>
                          {product.gsm} gsm
                        </dd>
                      </>
                    )}
                    {product.material && (
                      <>
                        <dt style={{ color: "#6b7280", fontSize: "14px", whiteSpace: "nowrap" }}>
                          Chất liệu
                        </dt>
                        <dd style={{ margin: 0, fontWeight: 500 }}>
                          {product.material}
                        </dd>
                      </>
                    )}
                    {product.fit && (
                      <>
                        <dt style={{ color: "#6b7280", fontSize: "14px", whiteSpace: "nowrap" }}>
                          Form
                        </dt>
                        <dd style={{ margin: 0, fontWeight: 500 }}>
                          {product.fit}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
              )}

              {/* SKU summary */}
              {skuCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    flexWrap: "wrap",
                    fontSize: "14px",
                    color: "#374151",
                    marginBottom: "16px",
                  }}
                >
                  <span>
                    <strong>{skuCount}</strong> SKU
                  </span>
                  {uniqueColors.length > 0 && (
                    <span>
                      <strong>{uniqueColors.length}</strong> màu
                    </span>
                  )}
                  {uniqueSizes.length > 0 && (
                    <span>Size: {uniqueSizes.join(", ")}</span>
                  )}
                </div>
              )}

              {/* Stock status */}
              {stockLabel && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "24px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: stockColor,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "14px",
                      color: stockColor,
                      fontWeight: 500,
                    }}
                  >
                    {stockLabel}
                  </span>
                </div>
              )}

              {/* Pricing notice */}
              <div
                className="card"
                style={{
                  marginBottom: "32px",
                  padding: "16px",
                  background: "#f9fafb",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#6b7280",
                    lineHeight: 1.6,
                  }}
                >
                  Vui lòng liên hệ để nhận báo giá dành cho đại lý và doanh
                  nghiệp.
                </p>
              </div>

              {/* CTAs */}
              <div
                style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
              >
                <TrackedLink
                  href="/dai-ly"
                  trackEvent="dealer_registration_click"
                  trackSource="PRODUCT_PAGE"
                  className="btn-primary"
                >
                  Đăng ký đại lý
                </TrackedLink>
                <TrackedLink
                  href="/lien-he"
                  trackEvent="contact_quote"
                  trackSource="PRODUCT_PAGE"
                  className="btn-secondary"
                >
                  Liên hệ báo giá
                </TrackedLink>
                <TrackedLink
                  href="https://zalo.me/0934337667"
                  trackEvent="contact_zalo"
                  trackSource="PRODUCT_PAGE"
                  external
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Chat Zalo
                </TrackedLink>
              </div>

              {/* Internal links */}
              <div
                style={{
                  marginTop: "28px",
                  paddingTop: "20px",
                  borderTop: "1px solid #f3f4f6",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <span
                  style={{ fontSize: "13px", color: "#9ca3af", alignSelf: "center" }}
                >
                  Tìm hiểu thêm:
                </span>
                {internalLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    style={{
                      fontSize: "13px",
                      color: "#374151",
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Product Description ───────────────────────────────────────────── */}
      <section
        className="section"
        style={{ borderTop: "1px solid #f3f4f6", background: "#f9fafb" }}
      >
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 700,
              margin: "0 0 24px",
            }}
          >
            Mô tả sản phẩm
          </h2>

          {displayContent || displayShortDescription ? (
            <>
              {displayShortDescription && (
                <p
                  style={{
                    fontSize: "16px",
                    lineHeight: 1.75,
                    color: "#374151",
                    fontWeight: 500,
                    margin: "0 0 20px",
                  }}
                >
                  {displayShortDescription}
                </p>
              )}

              {displayContent && (
                <div
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.8,
                    color: "#4b5563",
                    whiteSpace: "pre-wrap",
                    borderTop: displayShortDescription
                      ? "1px solid #e5e7eb"
                      : undefined,
                    paddingTop: displayShortDescription ? "20px" : undefined,
                  }}
                >
                  {displayContent}
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: "15px", color: "#9ca3af", margin: 0 }}>
              Thông tin sản phẩm đang được cập nhật.
            </p>
          )}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section
        className="section"
        style={{ borderTop: "1px solid #e5e7eb" }}
      >
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              margin: "0 0 24px",
              color: "#111827",
            }}
          >
            Hỏi đáp thường gặp
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {faqItems.map(({ question, answer }) => (
              <details
                key={question}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  background: "#fff",
                  overflow: "hidden",
                }}
              >
                <summary
                  style={{
                    padding: "16px 20px",
                    fontWeight: 600,
                    fontSize: "15px",
                    color: "#111827",
                    cursor: "pointer",
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    userSelect: "none",
                  }}
                >
                  {question}
                  <span
                    aria-hidden
                    style={{ fontSize: "20px", lineHeight: 1, color: "#9ca3af", flexShrink: 0 }}
                  >
                    +
                  </span>
                </summary>

                <div
                  style={{
                    padding: "0 20px 16px",
                    fontSize: "15px",
                    lineHeight: 1.7,
                    color: "#4b5563",
                    borderTop: "1px solid #f3f4f6",
                  }}
                >
                  <p style={{ margin: "12px 0 0" }}>{answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related Products ─────────────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <section
          className="section"
          style={{ borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}
        >
          <div className="container">
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 700,
                margin: "0 0 24px",
                color: "#111827",
              }}
            >
              Sản phẩm liên quan
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              {relatedProducts.map((related) => (
                <Link
                  key={related.id}
                  href={`/san-pham/${related.slug}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <article
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      overflow: "hidden",
                      background: "#fff",
                    }}
                  >
                    {/* Product thumbnail */}
                    <div
                      style={{
                        aspectRatio: "1 / 1",
                        background: "#f3f4f6",
                        overflow: "hidden",
                      }}
                    >
                      {related.images[0]?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={related.images[0].imageUrl}
                          alt={related.images[0].altText ?? related.name}
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : null}
                    </div>

                    <div style={{ padding: "12px 14px" }}>
                      <h3
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#111827",
                          margin: "0 0 4px",
                          lineHeight: 1.4,
                        }}
                      >
                        {related.name}
                      </h3>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#9ca3af",
                          margin: 0,
                        }}
                      >
                        {related.variants.length} SKU
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            <div style={{ marginTop: "20px" }}>
              <Link
                href={`/${product.category.slug}`}
                style={{
                  fontSize: "14px",
                  color: "#1d4ed8",
                  textDecoration: "none",
                }}
              >
                Xem tất cả {product.category.name} →
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
