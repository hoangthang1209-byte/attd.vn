import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug, getRelatedProducts } from "@/features/products/services/product.service";
import ProductCard from "@/components/public/ProductCard";
import ProductImageGallery from "@/components/public/ProductImageGallery";
import StickyInquiryBox from "@/components/public/StickyInquiryBox";
import ProductFaqList from "@/components/public/ProductFaqList";
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
      <section className="section-compact">
        <div className="container">
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ gap: 56, alignItems: "start" }}
          >
            <ProductImageGallery
              images={product.images}
              productName={displayName}
            />

            <div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                {(catalog?.sku ?? product.productCode) && (
                  <span className="product-meta-pill">
                    {catalog?.sku ?? product.productCode}
                  </span>
                )}
                <Link
                  href={`/${categorySlug}`}
                  style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}
                >
                  {categoryName}
                </Link>
              </div>

              <h1
                style={{
                  fontSize: "clamp(28px, 3.5vw, 36px)",
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  margin: "0 0 20px",
                }}
              >
                {displayName}
              </h1>

              {displayShortDescription && (
                <p
                  style={{
                    color: "#6b7280",
                    lineHeight: 1.75,
                    fontSize: 16,
                    margin: "0 0 28px",
                  }}
                >
                  {displayShortDescription}
                </p>
              )}

              {hasSpecs && (
                <div className="premium-card-static" style={{ marginBottom: 24, padding: 20 }}>
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
                    gap: 20,
                    flexWrap: "wrap",
                    fontSize: 14,
                    color: "#374151",
                    marginBottom: 28,
                    padding: "16px 0",
                    borderTop: "1px solid #f3f4f6",
                    borderBottom: "1px solid #f3f4f6",
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

              <StickyInquiryBox
                stockLabel={stockLabel}
                stockColor={stockColor}
                internalLinks={internalLinks}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Product Description ───────────────────────────────────────────── */}
      <section className="section-alt section-compact">
        <div className="container" style={{ maxWidth: 760 }}>
          <h2
            className="section-title"
            style={{ fontSize: 24, marginBottom: 32 }}
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

      <section className="section-compact">
        <div className="container" style={{ maxWidth: 760 }}>
          <h2
            className="section-title"
            style={{ fontSize: 24, marginBottom: 32 }}
          >
            Hỏi đáp thường gặp
          </h2>
          <ProductFaqList items={faqItems} />
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="section-alt section-compact">
          <div className="container">
            <h2
              className="section-title"
              style={{ fontSize: 24, marginBottom: 32 }}
            >
              Sản phẩm liên quan
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 24,
              }}
            >
              {relatedProducts.map((related) => (
                <ProductCard
                  key={related.id}
                  id={related.id}
                  slug={related.slug}
                  name={related.name}
                  skuCount={related.variants.length}
                  category={categoryName}
                />
              ))}
            </div>

            <div style={{ marginTop: 28 }}>
              <Link href={`/${categorySlug}`} className="link-chip">
                Xem tất cả {categoryName}
                <span aria-hidden style={{ color: "#9ca3af" }}>
                  →
                </span>
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
