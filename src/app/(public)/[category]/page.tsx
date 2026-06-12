import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductCard from "@/components/public/ProductCard";
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
      <section className="section" style={{ paddingBottom: "24px" }}>
        <div className="container" style={{ padding: "0 24px" }}>
          {cat.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cat.imageUrl}
              alt={cat.name}
              style={{
                width: "100%",
                maxHeight: "320px",
                objectFit: "cover",
                borderRadius: "12px",
                marginBottom: "32px",
              }}
            />
          )}

          {/* Single H1 per page */}
          <h1
            className="section-title"
            style={{ marginBottom: "12px" }}
          >
            {cat.name}
          </h1>

          <p
            className="section-description"
            style={{ marginBottom: "32px", maxWidth: "720px" }}
          >
            {content?.shortIntro ??
              cat.description ??
              `Nguồn hàng ${cat.name.toLowerCase()} dành cho đại lý, xưởng in và doanh nghiệp.`}
          </p>

          {/* ── Product Grid ─────────────────────────────────────────── */}
          {cat.products.length === 0 ? (
            <div
              style={{
                padding: "48px 0",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: "15px",
              }}
            >
              Chưa có sản phẩm trong danh mục này.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "20px",
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
        <CollectionSEOContent
          title={cat.name}
          intro={content.intro}
          benefits={content.benefits}
          applications={content.applications}
          faq={content.faq}
          ctaTitle={content.ctaTitle}
          ctaDescription={content.ctaDescription}
        />
      ) : (
        /* Fallback for categories without static content */
        <section
          style={{
            background: "#f9fafb",
            borderTop: "1px solid #e5e7eb",
            padding: "48px 0",
          }}
        >
          <div
            className="container"
            style={{ padding: "0 24px", maxWidth: "800px" }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                marginBottom: "16px",
                color: "#111827",
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
              <p
                style={{
                  fontSize: "15px",
                  lineHeight: "1.75",
                  color: "#9ca3af",
                }}
              >
                Dữ liệu danh mục đang được cập nhật.
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
