import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug, getRelatedProducts } from "@/features/products/services/product.service";
import ProductCard from "@/components/public/ProductCard";
import ProductImageGallery from "@/components/public/ProductImageGallery";
import ProductInquiryPanel from "@/components/marketplace/ProductInquiryPanel";
import ProductOptionTable from "@/components/marketplace/ProductOptionTable";
import ProductSpecTable from "@/components/marketplace/ProductSpecTable";
import ProductFaqList from "@/components/public/ProductFaqList";
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

  const hasFeatures = product.supportsPrinting || product.supportsEmbroidery || product.supportsOem;

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
      question: "Số lượng tối thiểu là bao nhiêu?",
      answer: product.defaultMoq
        ? `Số lượng tối thiểu là ${product.defaultMoq} cái. Liên hệ để biết chính sách ưu đãi theo số lượng.`
        : "Liên hệ ATTD để được tư vấn số lượng tối thiểu theo từng dòng sản phẩm.",
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

      <section className="mp-product-detail">
        <div className="container">
          <div className="mp-product-detail-layout">
            <div className="mp-product-detail-gallery">
              <ProductImageGallery
                images={unifiedImages}
                productName={displayName}
              />
            </div>

            <div className="mp-product-detail-summary">
              <div className="mp-product-detail-meta">
                <Link href={`/${categorySlug}`} className="mp-product-detail-cat">
                  {categoryName}
                </Link>
                {(catalog?.sku ?? product.productCode) && (
                  <span className="mp-product-detail-code">
                    Mã sản phẩm: {catalog?.sku ?? product.productCode}
                  </span>
                )}
              </div>

              <h1 className="mp-product-detail-title">{displayName}</h1>

              {displayShortDescription && (
                <p className="mp-product-detail-desc">{displayShortDescription}</p>
              )}

              <dl className="mp-product-facts">
                {skuCount > 0 && (
                  <div className="mp-product-fact">
                    <dt>Số lựa chọn sản phẩm</dt>
                    <dd>{skuCount}</dd>
                  </div>
                )}
                {product.defaultMoq != null && (
                  <div className="mp-product-fact">
                    <dt>Số lượng tối thiểu</dt>
                    <dd>{product.defaultMoq} cái</dd>
                  </div>
                )}
                {product.leadTime && (
                  <div className="mp-product-fact">
                    <dt>Thời gian giao/sản xuất</dt>
                    <dd>{product.leadTime}</dd>
                  </div>
                )}
                {stockLabel && (
                  <div className="mp-product-fact">
                    <dt>Tình trạng hàng</dt>
                    <dd style={{ color: stockColor }}>{stockLabel}</dd>
                  </div>
                )}
              </dl>

              {hasFeatures && (
                <div className="mp-product-service-badges">
                  {product.supportsPrinting && (
                    <span className="mp-product-service-badge">In logo</span>
                  )}
                  {product.supportsEmbroidery && (
                    <span className="mp-product-service-badge">Thêu</span>
                  )}
                  {product.supportsOem && (
                    <span className="mp-product-service-badge mp-product-service-badge--oem">OEM</span>
                  )}
                </div>
              )}

              <ProductInquiryPanel
                stockLabel={stockLabel}
                stockColor={stockColor}
                productName={displayName}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mp-section mp-section--compact">
        <div className="container">
          <ProductOptionTable
            variants={product.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              colorName: v.colorName ?? v.color?.name,
              colorCode: v.colorCode,
              sizeName: v.sizeName ?? v.size?.name,
              dimensions: v.dimensions,
              capacity: v.capacity,
              stockStatus: v.stockStatus,
            }))}
          />
        </div>
      </section>

      <section className="mp-section mp-section--alt mp-section--compact">
        <div className="container">
          <ProductSpecTable
            material={product.material}
            form={product.form}
            fit={product.fit}
            gsm={product.gsm}
            defaultMoq={product.defaultMoq}
            leadTime={product.leadTime}
            useCases={product.useCases as string[]}
            targetCustomers={product.targetCustomers as string[]}
            supportsPrinting={product.supportsPrinting}
            supportsEmbroidery={product.supportsEmbroidery}
            supportsOem={product.supportsOem}
          />
        </div>
      </section>

      <section className="mp-section mp-section--compact">
        <div className="container mp-product-desc">
          <h2 className="mp-section-title">Mô tả sản phẩm</h2>

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

      <section className="mp-section mp-section--alt mp-section--compact">
        <div className="container mp-product-faq">
          <h2 className="mp-section-title">Hỏi đáp thường gặp</h2>
          <ProductFaqList items={faqItems} />
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="mp-section mp-section--compact">
          <div className="container">
            <h2 className="mp-section-title">Sản phẩm liên quan</h2>
            <div className="mp-product-grid">
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
