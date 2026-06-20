import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  getProductBySlug,
  getRelatedProducts,
  getCrossSellProducts,
} from "@/features/products/services/product.service";
import ProductCard from "@/components/public/ProductCard";
import ProductDetailInteractive from "@/components/marketplace/ProductDetailInteractive";
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
  buildProductImages,
  getPrimaryProductImageFromProduct,
  getProductGalleryImages,
} from "@/lib/productImages";
import { getCatalogProduct } from "@/lib/productCatalog";
import {
  formatPdpMoqText,
  isPublicMoq,
} from "@/lib/formatMoq";
import { isValidImageSrc } from "@/lib/imagePaths";

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

  const unifiedImages = buildProductImages(product);
  const galleryImages = getProductGalleryImages(unifiedImages);

  const [relatedProducts, crossSellProducts] = await Promise.all([
    getRelatedProducts(product.category.id, product.id, 4),
    getCrossSellProducts(product.id, product.category.id, 4),
  ]);

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

  const useCases = (product.useCases as string[] | null) ?? [];
  const targetCustomers = (product.targetCustomers as string[] | null) ?? [];

  const variantRows = product.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    colorName: v.colorName ?? v.color?.name,
    colorCode: v.colorCode,
    sizeName: v.sizeName ?? v.size?.name,
    dimensions: v.dimensions,
    capacity: v.capacity,
    stockStatus: v.stockStatus,
    imageUrl: v.imageUrl,
    stockQty: v.stockQty,
  }));

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
      question: "Sản phẩm này có hỗ trợ in logo không?",
      answer: product.supportsPrinting
        ? "Có. Sản phẩm này hỗ trợ in logo theo yêu cầu thương hiệu."
        : "Liên hệ ATTD để được tư vấn phương án in phù hợp với từng dòng sản phẩm.",
    },
    {
      question: "Số lượng tối thiểu là bao nhiêu?",
      answer: isPublicMoq(product.defaultMoq)
        ? `${formatPdpMoqText(product.defaultMoq)}. Liên hệ để nhận báo giá theo số lượng đặt hàng.`
        : "Liên hệ ATTD để được tư vấn số lượng tối thiểu theo từng dòng sản phẩm.",
    },
    {
      question: "Thời gian giao/sản xuất bao lâu?",
      answer: product.leadTime
        ? product.leadTime
        : "Hàng có sẵn giao trong 1–3 ngày. Đơn số lượng lớn hoặc gia công in/thêu/OEM: 5–20 ngày tùy quy cách.",
    },
    {
      question: "ATTD có hỗ trợ đại lý không?",
      answer:
        "Có. ATTD hỗ trợ đại lý đồng phục, agency quà tặng và xưởng in/thêu với chính sách nguồn hàng B2B.",
    },
    {
      question: "Có thể đặt OEM/private label không?",
      answer: product.supportsOem
        ? "Có. Sản phẩm này hỗ trợ OEM/private label theo yêu cầu."
        : "Liên hệ ATTD để được tư vấn khả năng OEM/private label cho dòng sản phẩm bạn quan tâm.",
    },
  ];

  return (
    <main className="mp-pdp mp-pdp--anatomy">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <FaqSchema items={faqItems} />

      <div className="mp-pdp-breadcrumb">
        <Breadcrumb
          items={[
            { name: "Sản phẩm", href: "/san-pham" },
            { name: categoryName, href: `/${categorySlug}` },
            { name: displayName, href: `/san-pham/${slug}` },
          ]}
        />
      </div>

      <ProductDetailInteractive
        displayName={displayName}
        categoryName={categoryName}
        categorySlug={categorySlug}
        productCode={catalog?.sku ?? product.productCode}
        displayShortDescription={displayShortDescription}
        displayContent={displayContent}
        baseImages={unifiedImages}
        variants={variantRows}
        material={product.material}
        defaultMoq={product.defaultMoq}
        leadTime={product.leadTime}
        supportsPrinting={product.supportsPrinting}
        supportsEmbroidery={product.supportsEmbroidery}
        supportsOem={product.supportsOem}
        aggregateStockLabel={stockLabel}
        aggregateStockColor={stockColor}
        skuCount={skuCount}
        keyAttributes={{
          material: product.material,
          form: product.form,
          fit: product.fit,
          defaultMoq: product.defaultMoq,
          leadTime: product.leadTime,
          supportsPrinting: product.supportsPrinting,
          supportsEmbroidery: product.supportsEmbroidery,
          supportsOem: product.supportsOem,
        }}
        useCases={useCases}
        targetCustomers={targetCustomers}
        gsm={product.gsm}
      />

      <section className="mp-section mp-section--compact" id="mp-pdp-desc">
        <div className="container mp-pdp-desc">
          <h2 className="mp-section-title">Mô tả sản phẩm</h2>

          {displayContent || displayShortDescription ? (
            <div className="mp-pdp-desc-content">
              {displayShortDescription && (
                <p className="product-desc-lead">{displayShortDescription}</p>
              )}
              {displayContent && (
                <div className="product-desc-body">{displayContent}</div>
              )}

              {galleryImages.length > 1 && (
                <div className="mp-pdp-desc-gallery">
                  {galleryImages.slice(1, 5).map((img, i) =>
                    isValidImageSrc(img.imageUrl) ? (
                      <div key={img.id ?? i} className="mp-pdp-desc-gallery-item">
                        <Image
                          src={img.imageUrl}
                          alt={img.altText ?? displayName}
                          fill
                          sizes="(max-width: 768px) 50vw, 240px"
                          className="mp-pdp-desc-gallery-img"
                        />
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {(useCases.length > 0 || targetCustomers.length > 0) && (
                <div className="mp-pdp-desc-cards">
                  {useCases.length > 0 && (
                    <div className="mp-pdp-desc-card">
                      <h3>Ứng dụng B2B</h3>
                      <ul>
                        {useCases.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {targetCustomers.length > 0 && (
                    <div className="mp-pdp-desc-card">
                      <h3>Phù hợp cho</h3>
                      <ul>
                        {targetCustomers.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="mp-pdp-desc-placeholder">
              Thông tin chi tiết sẽ được ATTD cập nhật theo từng dòng sản phẩm.
            </p>
          )}
        </div>
      </section>

      <section className="mp-section mp-section--alt mp-section--compact" id="mp-pdp-faq">
        <div className="container mp-product-faq">
          <h2 className="mp-section-title">Hỏi đáp thường gặp</h2>
          <ProductFaqList items={faqItems} />
        </div>
      </section>

      <div id="mp-pdp-related">
        {relatedProducts.length > 0 && (
          <section className="mp-section mp-section--compact">
            <div className="container">
              <h2 className="mp-section-title">Sản phẩm cùng danh mục</h2>
              <div className="mp-product-grid mp-product-grid--compact">
                {relatedProducts.map((related) => (
                  <ProductCard
                    key={related.id}
                    id={related.id}
                    slug={related.slug}
                    name={related.name}
                    category={categoryName}
                    imageUrl={getPrimaryProductImageFromProduct(related)}
                    moq={related.defaultMoq}
                    leadTime={related.leadTime}
                    compact
                  />
                ))}
              </div>
              <div className="mp-pdp-related-more">
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

        {crossSellProducts.length > 0 && (
          <section className="mp-section mp-section--alt mp-section--compact">
            <div className="container">
              <h2 className="mp-section-title">Nguồn hàng có thể đặt cùng</h2>
              <div className="mp-product-grid mp-product-grid--compact">
                {crossSellProducts.map((related) => (
                  <ProductCard
                    key={related.id}
                    id={related.id}
                    slug={related.slug}
                    name={related.name}
                    category={related.category.name}
                    imageUrl={getPrimaryProductImageFromProduct(related)}
                    moq={related.defaultMoq}
                    leadTime={related.leadTime}
                    compact
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
