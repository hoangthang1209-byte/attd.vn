import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/public/ProductCard";
import { getCategoryBySlug } from "@/features/categories/services/category.service";
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
  const cat = await getCategoryBySlug(category);
  if (!cat) return {};

  const title = cat.seoTitle ?? `${cat.name} | ${SITE_NAME}`;
  const description =
    cat.seoDescription ?? cat.description ?? `${cat.name} — ${DEFAULT_DESCRIPTION}`;
  const ogImages = buildOgImages(cat.imageUrl);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl(`/${category}`),
    },
    openGraph: {
      title: cat.seoTitle ?? cat.name,
      description,
      url: canonicalUrl(`/${category}`),
      siteName: SITE_NAME,
      images: ogImages,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);

  if (!cat) notFound();

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cat.name,
    description:
      cat.seoDescription ??
      cat.description ??
      `${cat.name} — ${DEFAULT_DESCRIPTION}`,
    url: canonicalUrl(`/${category}`),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };

  const hasContent = Boolean(cat.description);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      {/* Breadcrumb ─────────────────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: "1px solid #e5e7eb",
          background: "#f9fafb",
        }}
      >
        <div
          className="container"
          style={{
            padding: "12px 24px",
            fontSize: "13px",
            color: "#6b7280",
            display: "flex",
            gap: "6px",
            alignItems: "center",
          }}
        >
          <Link href="/" style={{ color: "#6b7280", textDecoration: "none" }}>
            Trang chủ
          </Link>
          <span>/</span>
          <span style={{ color: "#111827" }}>{cat.name}</span>
        </div>
      </div>

      {/* Category Hero ───────────────────────────────────────────────────── */}
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

          <h1
            className="section-title"
            style={{ marginBottom: hasContent ? "12px" : "32px" }}
          >
            {cat.name}
          </h1>

          {cat.description && (
            <p
              className="section-description"
              style={{ marginBottom: "32px", maxWidth: "720px" }}
            >
              {cat.description}
            </p>
          )}

          {!cat.description && (
            <p
              className="section-description"
              style={{ marginBottom: "32px" }}
            >
              Nguồn hàng {cat.name.toLowerCase()} dành cho đại lý, xưởng in và
              doanh nghiệp.
            </p>
          )}

          {/* Product Grid ──────────────────────────────────────────────── */}
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

      {/* Description Section (SEO content below fold) ───────────────────── */}
      <section
        style={{
          background: "#f9fafb",
          borderTop: "1px solid #e5e7eb",
          padding: "48px 0",
        }}
      >
        <div className="container" style={{ padding: "0 24px", maxWidth: "800px" }}>
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
    </main>
  );
}
