import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductCard from "@/components/public/ProductCard";
import { mapPublicProductCardSalesBadges } from "@/features/products/product-sales-badges";
import CatalogSourcingBadges from "@/components/marketplace/CatalogSourcingBadges";
import InternalLinkBlock from "@/components/public/InternalLinkBlock";
import TrustBlock from "@/components/public/TrustBlock";
import EmptyState from "@/components/public/EmptyState";
import Breadcrumb from "@/components/seo/Breadcrumb";
import FaqSchema from "@/components/seo/FaqSchema";
import CollectionSchema from "@/components/seo/CollectionSchema";
import CollectionSEOContent from "@/components/seo/CollectionSEOContent";
import ItemListSchema from "@/components/seo/ItemListSchema";
import { getCategoryBySlug } from "@/features/categories/services/category.service";
import { loadCollectionContent } from "@/features/landing-pages/load-collection-cms";
import {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  canonicalUrl,
  buildOgImages,
} from "@/lib/seo";
import { applyCategoryLandingIndexation } from "@/lib/seo/indexation-policy";
import { isBlockedDynamicCategorySegment } from "@/lib/seo/indexable-category-routes";
import {
  getCategoryHeroImage,
  getCategoryGalleryImages,
} from "@/lib/categoryImages";
import { getPrimaryProductImageFromProduct, getProductCardHoverImageFromProduct } from "@/lib/productImages";
import { isValidImageSrc } from "@/lib/imagePaths";

type PageProps = {
  params: Promise<{ category: string }>;
};

const STOCK_LABELS: Record<string, string> = {
  IN_STOCK: "Còn hàng",
  LOW_STOCK: "Sắp hết",
  OUT_OF_STOCK: "Hết hàng",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  if (isBlockedDynamicCategorySegment(category)) return {};
  const [cat, content] = await Promise.all([
    getCategoryBySlug(category),
    loadCollectionContent(category),
  ]);
  if (!cat) return {};

  // Static content overrides DB seoTitle / seoDescription when available
  const title =
    content?.seoTitle ?? cat.seoTitle ?? `${cat.name} | ${SITE_NAME}`;
  const description =
    content?.metaDescription ??
    cat.seoDescription ??
    cat.description ??
    `${cat.name} — ${DEFAULT_DESCRIPTION}`;
  const ogImages = buildOgImages(cat.imageUrl);

  return {
    title,
    description,
    openGraph: {
      title: content?.seoTitle ?? cat.seoTitle ?? cat.name,
      description,
      url: canonicalUrl(`/${category}`),
      siteName: SITE_NAME,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: content?.seoTitle ?? cat.seoTitle ?? cat.name,
      description,
      images: ogImages,
    },
    ...applyCategoryLandingIndexation(category),
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  if (isBlockedDynamicCategorySegment(category)) notFound();

  const [cat, content] = await Promise.all([
    getCategoryBySlug(category),
    loadCollectionContent(category),
  ]);

  if (!cat) notFound();

  const pageTitle = content?.seoTitle ?? cat.seoTitle ?? `${cat.name} | ${SITE_NAME}`;
  const pageDescription =
    content?.metaDescription ??
    cat.seoDescription ??
    cat.description ??
    `${cat.name} — ${DEFAULT_DESCRIPTION}`;

  const heroImage = getCategoryHeroImage(category, cat.imageUrl);
  const galleryImages = getCategoryGalleryImages(category);

  return (
    <main>
      {/* ── Structured Data ────────────────────────────────────────────── */}
      <CollectionSchema
        title={pageTitle}
        description={pageDescription}
        url={canonicalUrl(`/${category}`)}
      />
      {content?.faq && content.faq.length > 0 && (
        <FaqSchema items={content.faq} />
      )}
      {cat.products.length > 0 && (
        <ItemListSchema
          items={cat.products
            .filter((p) => p.slug)
            .map((p, i) => ({ position: i + 1, name: p.name, slug: p.slug }))}
        />
      )}

      {/* ── Breadcrumb (visual + JSON-LD) ──────────────────────────────── */}
      <Breadcrumb items={[{ name: cat.name }]} />

      {/* ── Category Hero ──────────────────────────────────────────────── */}
      <section className="mp-category-listing-hero">
        <div className="container">
          <div className="mp-category-listing-hero__card">
            <div className="mp-category-listing-hero__copy">
              <p className="mp-catalog-eyebrow">Danh mục nguồn hàng B2B</p>
              <h1 className="mp-catalog-title">{cat.name}</h1>

              <p className="mp-catalog-desc">
                {content?.shortIntro ??
                  cat.description ??
                  `Nguồn hàng ${cat.name.toLowerCase()} dành cho đại lý, xưởng in và doanh nghiệp.`}
              </p>

              <CatalogSourcingBadges />
            </div>

            {(heroImage && isValidImageSrc(heroImage)) || galleryImages.length > 0 ? (
              <div className="mp-category-listing-hero__media">
                {heroImage && isValidImageSrc(heroImage) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroImage}
                    alt={cat.name}
                    className="category-hero-img"
                  />
                )}

                {galleryImages.length > 0 && (
                  <div className="category-gallery-grid">
                    {galleryImages.map((src) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src}
                        src={src}
                        alt={`${cat.name} — gallery`}
                        className="category-gallery-item"
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mp-category-listing-hero__media mp-category-listing-hero__media--empty" aria-hidden>
                <span>ATTD</span>
                <small>Nguồn hàng B2B</small>
              </div>
            )}
          </div>

          <div className="mp-category-listing-trust">
            <TrustBlock variant="strip" />
          </div>

          <div className="mp-category-listing-section-header">
            <div>
              <p className="mp-catalog-results-kicker">Sản phẩm trong danh mục</p>
              <h2 className="mp-category-listing-section-title">
                {cat.products.length > 0
                  ? `${cat.products.length} sản phẩm ${cat.name}`
                  : `Nguồn hàng ${cat.name}`}
              </h2>
            </div>
            <p className="mp-category-listing-section-desc">
              Chọn mẫu phù hợp, gửi số lượng/logo để ATTD tư vấn MOQ, tồn kho và báo giá B2B.
            </p>
          </div>

          {cat.products.length === 0 ? (
            <div className="mp-catalog-empty">
              <EmptyState
                title="Chưa có sản phẩm trong danh mục này"
                description="Liên hệ ATTD để được tư vấn nguồn hàng thay thế, MOQ và báo giá theo nhu cầu."
              />
            </div>
          ) : (
            <div className="mp-product-grid mp-product-grid--catalog">
              {cat.products.map((product) => {
                const stockStatuses = product.variants.map((variant) => variant.stockStatus);
                const stock = stockStatuses.includes("IN_STOCK")
                  ? "IN_STOCK"
                  : stockStatuses.includes("LOW_STOCK")
                    ? "LOW_STOCK"
                    : stockStatuses.length > 0
                      ? "OUT_OF_STOCK"
                      : null;

                return (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    slug={product.slug}
                    name={product.name}
                    productCode={product.productCode}
                    skuCount={product.variants.length}
                    category={cat.name}
                    imageUrl={getPrimaryProductImageFromProduct(product)}
                    hoverImageUrl={getProductCardHoverImageFromProduct(product)}
                    moq={product.defaultMoq}
                    leadTime={product.leadTime}
                    stockStatus={stock ?? undefined}
                    stockLabel={stock ? STOCK_LABELS[stock] : undefined}
                    supportsPrinting={product.supportsPrinting}
                    supportsEmbroidery={product.supportsEmbroidery}
                    supportsOem={product.supportsOem}
                    variant="catalog"
                    salesBadges={mapPublicProductCardSalesBadges(product)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Long-form SEO Content (shown when static content exists) ──── */}
      {content ? (
        <>
          <CollectionSEOContent
            title={cat.name}
            intro={content.intro}
            benefits={content.benefits}
            applications={content.applications}
            faq={content.faq}
            ctaTitle={content.ctaTitle}
            ctaDescription={content.ctaDescription}
          />
          {/* ── Wholesale cluster links (cross-linking to SEO keyword pages) */}
          {content.wholesaleCluster && (
            <InternalLinkBlock
              title={content.wholesaleCluster.title}
              links={content.wholesaleCluster.links}
            />
          )}

          {content.knowledgeCluster && (
            <InternalLinkBlock
              title={content.knowledgeCluster.title}
              links={content.knowledgeCluster.links}
              alt
            />
          )}
        </>
      ) : (
        /* Fallback for categories without static content */
        <section className="section-alt section-compact">
          <div className="container" style={{ maxWidth: 800 }}>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 20,
                letterSpacing: "-0.02em",
              }}
            >
              Về danh mục {cat.name}
            </h2>

            {cat.description ? (
              <p
                style={{
                  fontSize: "15px",
                  lineHeight: "1.75",
                  color: "#374151",
                  whiteSpace: "pre-wrap",
                }}
              >
                {cat.description}
              </p>
            ) : (
              <EmptyState
                title="Dữ liệu danh mục đang được cập nhật"
                description="Liên hệ ATTD để nhận tư vấn nguồn hàng và báo giá cho danh mục này."
              />
            )}
          </div>
        </section>
      )}
    </main>
  );
}
