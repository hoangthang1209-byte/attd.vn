import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/public/ProductCard";
import { mapPublicProductCardSalesBadges } from "@/features/products/product-sales-badges";
import CatalogSourcingBadges from "@/components/marketplace/CatalogSourcingBadges";
import B2BTrustSignals from "@/components/public/B2BTrustSignals";
import InternalLinkBlock from "@/components/public/InternalLinkBlock";
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

const CATEGORY_FINAL_REASSURANCE = [
  "Tư vấn theo số lượng",
  "Phản hồi trong giờ làm việc",
  "Không spam",
];

function getCategoryUseCases(categoryName: string) {
  const normalized = categoryName.toLocaleLowerCase("vi-VN");

  if (normalized.includes("polo")) {
    return [
      {
        title: "Đồng phục văn phòng",
        description: "Dáng cổ bẻ gọn gàng cho đội ngũ bán hàng, chăm sóc khách hàng và nhân sự văn phòng.",
      },
      {
        title: "Hàng trơn cho xưởng in",
        description: "Nguồn polo trơn ổn định để in/thêu logo theo đơn doanh nghiệp.",
      },
      {
        title: "Sự kiện & activation",
        description: "Phù hợp cho đội ngũ triển khai, roadshow và sự kiện thương hiệu cần hình ảnh đồng nhất.",
      },
      {
        title: "OEM/private label",
        description: "Tư vấn chất liệu, màu sắc và quy cách khi cần phát triển dòng polo riêng.",
      },
    ];
  }

  if (normalized.includes("nón") || normalized.includes("non")) {
    return [
      {
        title: "Quà tặng sự kiện",
        description: "Nón đồng bộ cho hội nghị, activation, team building và chiến dịch ngoài trời.",
      },
      {
        title: "Đồng phục triển khai",
        description: "Phù hợp cho đội bán hàng, PG/PB, nhân sự giao nhận và nhóm vận hành.",
      },
      {
        title: "Hàng trơn cho xưởng in",
        description: "Nguồn nón cơ bản để thêu logo, in chuyển nhiệt hoặc gắn nhãn theo yêu cầu.",
      },
      {
        title: "Bộ quà tặng doanh nghiệp",
        description: "Kết hợp cùng áo, tote hoặc bình giữ nhiệt để tạo set quà tặng đồng bộ.",
      },
    ];
  }

  if (normalized.includes("tote") || normalized.includes("túi")) {
    return [
      {
        title: "Quà tặng hội nghị",
        description: "Tote bag dùng cho sự kiện, onboarding, hội thảo và chương trình khách hàng thân thiết.",
      },
      {
        title: "Bao bì thương hiệu",
        description: "Túi vải tối giản để in logo, phối bộ quà tặng hoặc đóng gói sản phẩm.",
      },
      {
        title: "Hàng trơn cho agency",
        description: "Nguồn tote trơn dễ tùy biến cho agency, event company và xưởng in.",
      },
      {
        title: "OEM/private label",
        description: "Tư vấn kích thước, chất liệu và quy cách khi cần phát triển mẫu riêng.",
      },
    ];
  }

  if (normalized.includes("bình") || normalized.includes("giữ nhiệt")) {
    return [
      {
        title: "Quà tặng doanh nghiệp",
        description: "Bình giữ nhiệt cho khách hàng, nhân sự, hội nghị và chương trình tri ân.",
      },
      {
        title: "Bộ quà tặng cao cấp",
        description: "Kết hợp cùng áo, tote hoặc hộp quà để tạo set quà tặng thương hiệu.",
      },
      {
        title: "Logo doanh nghiệp",
        description: "Tư vấn phương án khắc/in logo phù hợp ngân sách và số lượng.",
      },
      {
        title: "Đơn số lượng lớn",
        description: "Hỗ trợ báo giá theo số lượng, thời gian giao hàng và phương án đóng gói.",
      },
    ];
  }

  return [
    {
      title: "Đồng phục doanh nghiệp",
      description: "Nguồn hàng phù hợp cho đội ngũ nhân sự, sự kiện nội bộ và chương trình thương hiệu.",
    },
    {
      title: "Hàng trơn cho xưởng in",
      description: "Dễ tùy biến logo, màu sắc và size cho xưởng in, agency và đơn vị sự kiện.",
    },
    {
      title: "Quà tặng sự kiện",
      description: "Tư vấn phối sản phẩm theo ngân sách, số lượng và thời gian cần hàng.",
    },
    {
      title: "OEM/private label",
      description: "Hỗ trợ phát triển sản phẩm theo yêu cầu khi cần nguồn hàng riêng cho thương hiệu.",
    },
  ];
}

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

              <div className="mp-category-hero-actions" aria-label="Hành động danh mục">
                <Link href="/lien-he" className="btn-primary">
                  Yêu cầu báo giá
                </Link>
                <a href="#category-products" className="btn-secondary">
                  Xem sản phẩm
                </a>
              </div>
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

          <div id="category-products" className="mp-category-listing-section-header">
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
                title="ATTD có thể tư vấn nguồn hàng phù hợp"
                description="Gửi số lượng, chất liệu và ngân sách dự kiến để ATTD đề xuất sản phẩm thay thế, MOQ và báo giá B2B."
              />
              <Link href="/lien-he" className="btn-primary mp-catalog-empty-cta">
                Gửi yêu cầu báo giá
              </Link>
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

          <section className="mp-category-use-cases" aria-labelledby="category-use-cases-title">
            <div className="mp-category-use-cases__header">
              <p className="mp-catalog-results-kicker">Ứng dụng B2B</p>
              <h2 id="category-use-cases-title" className="mp-category-listing-section-title">
                {cat.name} thường được dùng cho
              </h2>
            </div>
            <div className="mp-category-use-case-grid">
              {getCategoryUseCases(cat.name).map((item) => (
                <article key={item.title} className="mp-category-use-case-card">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>
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
        <section className="section-alt section-compact mp-category-fallback-content">
          <div className="container">
            <div className="mp-category-fallback-content__card">
              <p className="mp-catalog-results-kicker">Thông tin danh mục</p>
              <h2>Về danh mục {cat.name}</h2>

              {cat.description ? (
                <p>{cat.description}</p>
              ) : (
                <EmptyState
                  title="Dữ liệu danh mục đang được cập nhật"
                  description="Liên hệ ATTD để nhận tư vấn nguồn hàng và báo giá cho danh mục này."
                />
              )}
            </div>
          </div>
        </section>
      )}

      {!content && (
        <section className="mp-category-final-cta" aria-labelledby="category-final-cta-title">
          <div className="container">
            <div className="mp-category-final-cta__card">
              <div>
                <p className="mp-catalog-results-kicker">Bắt đầu nguồn hàng</p>
                <h2 id="category-final-cta-title">Cần báo giá {cat.name} cho doanh nghiệp?</h2>
                <p>
                  Gửi nhu cầu số lượng, logo và thời gian cần hàng. ATTD sẽ tư vấn phương án phù hợp thay vì ép bạn chọn mẫu ngay.
                </p>
                <B2BTrustSignals
                  items={CATEGORY_FINAL_REASSURANCE}
                  variant="inline"
                  ariaLabel="Cam kết khi gửi yêu cầu"
                />
              </div>
              <Link href="/lien-he" className="btn-primary">
                Gửi yêu cầu báo giá
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
