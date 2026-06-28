import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getProductDetailBySlug,
  getRelatedProducts,
} from "@/features/products/services/product.service";
import ProductCard from "@/components/public/ProductCard";
import { mapPublicProductCardSalesBadges } from "@/features/products/product-sales-badges";
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
import { getCatalogProduct } from "@/lib/productCatalog";
import { formatPdpMoqText, isPublicMoq } from "@/lib/formatMoq";
import { getPrimaryProductImageFromProduct, getProductCardHoverImageFromProduct } from "@/lib/productImages";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const catalog = getCatalogProduct(slug);
  const product = await getProductDetailBySlug(slug);
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

  const primaryImage = product?.images[0]?.imageUrl ?? null;
  const ogImages = buildOgImages(primaryImage);

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

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const catalog = getCatalogProduct(slug);
  const product = await getProductDetailBySlug(slug);
  if (!product && !catalog) notFound();
  if (!product) notFound();

  const displayName = catalog?.name ?? product.name;
  const displayShortDescription = catalog?.shortDescription ?? product.shortDescription;
  const displayContent = catalog?.content ?? product.description;

  const relatedProducts = product.category?.id
    ? await getRelatedProducts(product.category.id, product.id, 4)
    : [];

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
    ...(product.category?.name ? { category: product.category.name } : {}),
    ...((catalog?.sku ?? product.productCode) && {
      sku: catalog?.sku ?? product.productCode,
    }),
    ...(product.images.length > 0 && {
      image: product.images.map((img) => img.imageUrl).filter(Boolean),
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
    <main className="mp-pdp mp-pdp--anatomy mp-pdp--b2b">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <FaqSchema items={faqItems} />

      <div className="mp-pdp-breadcrumb">
        <Breadcrumb
          items={[
            { name: "Sản phẩm", href: "/san-pham" },
            { name: product.category?.name ?? "Danh mục", href: `/${product.category?.slug ?? "san-pham"}` },
            { name: displayName, href: `/san-pham/${slug}` },
          ]}
        />
      </div>

      <ProductDetailInteractive
        product={product}
        displayName={displayName}
        displayShortDescription={displayShortDescription}
        displayContent={displayContent}
        showRelatedTab={relatedProducts.length > 0}
      />

      <section className="mp-section mp-pdp-section mp-pdp-section--alt" id="mp-pdp-faq">
        <div className="container mp-pdp-faq">
          <header className="mp-pdp-section-head">
            <h2 className="mp-pdp-section-title">Hỏi đáp thường gặp</h2>
            <p className="mp-pdp-section-subtitle">
              Câu hỏi phổ biến từ đối tác B2B và đại lý đồng phục.
            </p>
          </header>
          <ProductFaqList items={faqItems} />
        </div>
      </section>

      <div id="mp-pdp-related">
        {relatedProducts.length > 0 && (
          <section className="mp-section mp-pdp-section">
            <div className="container">
              <header className="mp-pdp-section-head">
                <h2 className="mp-pdp-section-title">Sản phẩm liên quan</h2>
              </header>
              <div className="mp-product-grid mp-product-grid--compact">
                {relatedProducts.map((related) => (
                  <ProductCard
                    key={related.id}
                    id={related.id}
                    slug={related.slug}
                    name={related.name}
                    category={product.category?.name ?? ""}
                    imageUrl={getPrimaryProductImageFromProduct(related)}
                    hoverImageUrl={getProductCardHoverImageFromProduct(related)}
                    moq={related.defaultMoq}
                    leadTime={related.leadTime}
                    compact
                    salesBadges={mapPublicProductCardSalesBadges(related)}
                  />
                ))}
              </div>
              <div className="mp-pdp-related-more">
                <Link href={`/${product.category?.slug ?? "san-pham"}`} className="link-chip">
                  Xem tất cả {product.category?.name ?? "danh mục"}
                  <span aria-hidden style={{ color: "#9ca3af" }}>
                    →
                  </span>
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
