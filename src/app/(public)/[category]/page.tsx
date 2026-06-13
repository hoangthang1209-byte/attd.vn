import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductCard from "@/components/public/ProductCard";
import InternalLinkBlock from "@/components/public/InternalLinkBlock";
import TrustBlock from "@/components/public/TrustBlock";
import EmptyState from "@/components/public/EmptyState";
import Breadcrumb from "@/components/seo/Breadcrumb";
import FaqSchema from "@/components/seo/FaqSchema";
import CollectionSchema from "@/components/seo/CollectionSchema";
import CollectionSEOContent from "@/components/seo/CollectionSEOContent";
import ItemListSchema from "@/components/seo/ItemListSchema";
import { getCategoryBySlug } from "@/features/categories/services/category.service";
import { getCollectionContent } from "@/lib/collectionContent";
import {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  canonicalUrl,
  buildOgImages,
} from "@/lib/seo";

type PageProps = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const [cat, content] = await Promise.all([
    getCategoryBySlug(category),
    Promise.resolve(getCollectionContent(category)),
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
    alternates: {
      canonical: canonicalUrl(`/${category}`),
    },
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
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const [cat, content] = await Promise.all([
    getCategoryBySlug(category),
    Promise.resolve(getCollectionContent(category)),
  ]);

  if (!cat) notFound();

  const pageTitle = content?.seoTitle ?? cat.seoTitle ?? `${cat.name} | ${SITE_NAME}`;
  const pageDescription =
    content?.metaDescription ??
    cat.seoDescription ??
    cat.description ??
    `${cat.name} — ${DEFAULT_DESCRIPTION}`;

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
      <section className="section-compact" style={{ paddingBottom: 32 }}>
        <div className="container">
          {cat.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cat.imageUrl}
              alt={cat.name}
              style={{
                width: "100%",
                maxHeight: 280,
                objectFit: "cover",
                borderRadius: 12,
                marginBottom: 40,
                border: "1px solid #e5e7eb",
              }}
            />
          )}

          <h1 className="section-title" style={{ marginBottom: 16 }}>
            {cat.name}
          </h1>

          <p
            className="section-description"
            style={{ marginBottom: 32, maxWidth: 720 }}
          >
            {content?.shortIntro ??
              cat.description ??
              `Nguồn hàng ${cat.name.toLowerCase()} dành cho đại lý, xưởng in và doanh nghiệp.`}
          </p>

          <TrustBlock variant="strip" />

          {cat.products.length === 0 ? (
            <EmptyState
              title="Chưa có sản phẩm trong danh mục này"
              description="Liên hệ ATTD để được tư vấn nguồn hàng và báo giá theo nhu cầu."
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 24,
              }}
            >
              {cat.products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  slug={product.slug}
                  name={product.name}
                  productCode={product.productCode}
                  skuCount={product.variants.length}
                  category={cat.name}
                />
              ))}
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
