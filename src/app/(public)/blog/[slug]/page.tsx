import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPostBySlug,
  getRelatedPosts,
} from "@/features/posts/services/post.service";
import {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  canonicalUrl,
  buildOgImages,
} from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.status !== "PUBLISHED") return {};

  const title = post.seoTitle ?? `${post.title} | ${SITE_NAME}`;
  const description =
    post.seoDescription ?? post.excerpt ?? DEFAULT_DESCRIPTION;
  const ogImages = buildOgImages(post.imageUrl);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl(`/blog/${slug}`),
    },
    openGraph: {
      title: post.seoTitle ?? post.title,
      description,
      url: canonicalUrl(`/blog/${slug}`),
      siteName: SITE_NAME,
      images: ogImages,
      type: "article",
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [post, related] = await Promise.all([
    getPostBySlug(slug),
    getRelatedPosts(slug),
  ]);

  if (!post || post.status !== "PUBLISHED") notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription ?? post.excerpt ?? DEFAULT_DESCRIPTION,
    ...(post.imageUrl && { image: post.imageUrl }),
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    url: canonicalUrl(`/blog/${slug}`),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {/* Breadcrumb */}
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
          <Link href="/blog" style={{ color: "#6b7280", textDecoration: "none" }}>
            Blog
          </Link>
          <span>/</span>
          <span
            style={{
              color: "#111827",
              maxWidth: "300px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {post.title}
          </span>
        </div>
      </div>

      {/* Article */}
      <article>
        <section className="section" style={{ paddingBottom: "32px" }}>
          <div className="container" style={{ maxWidth: "760px" }}>
            <time
              dateTime={post.createdAt.toISOString()}
              style={{ fontSize: "13px", color: "#9ca3af" }}
            >
              {formatDate(post.createdAt)}
            </time>

            <h1
              style={{
                fontSize: "32px",
                fontWeight: 800,
                lineHeight: 1.25,
                margin: "12px 0 20px",
                color: "#111827",
              }}
            >
              {post.title}
            </h1>

            {post.excerpt && (
              <p
                style={{
                  fontSize: "18px",
                  color: "#4b5563",
                  lineHeight: 1.7,
                  margin: "0 0 32px",
                  fontStyle: "italic",
                }}
              >
                {post.excerpt}
              </p>
            )}

            {post.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.imageUrl}
                alt={post.title}
                style={{
                  width: "100%",
                  borderRadius: "12px",
                  marginBottom: "36px",
                  maxHeight: "480px",
                  objectFit: "cover",
                }}
              />
            )}

            {post.content ? (
              <div
                style={{
                  fontSize: "16px",
                  lineHeight: 1.85,
                  color: "#374151",
                  whiteSpace: "pre-wrap",
                }}
              >
                {post.content}
              </div>
            ) : (
              <p style={{ fontSize: "15px", color: "#9ca3af" }}>
                Nội dung đang được cập nhật.
              </p>
            )}
          </div>
        </section>
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <section
          style={{
            borderTop: "1px solid #e5e7eb",
            background: "#f9fafb",
            padding: "48px 0",
          }}
        >
          <div className="container">
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 700,
                marginBottom: "28px",
                color: "#111827",
              }}
            >
              Bài viết liên quan
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "20px",
              }}
            >
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/blog/${p.slug}`}
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
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        style={{
                          width: "100%",
                          height: "160px",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: "160px",
                          background: "#f3f4f6",
                        }}
                      />
                    )}

                    <div style={{ padding: "16px" }}>
                      <time
                        dateTime={new Date(p.createdAt).toISOString()}
                        style={{
                          fontSize: "11px",
                          color: "#9ca3af",
                          display: "block",
                          marginBottom: "6px",
                        }}
                      >
                        {new Intl.DateTimeFormat("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }).format(new Date(p.createdAt))}
                      </time>

                      <h3
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          lineHeight: 1.4,
                          color: "#111827",
                          margin: 0,
                        }}
                      >
                        {p.title}
                      </h3>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* B2B Resource Links */}
      <section
        style={{
          borderTop: "1px solid #e5e7eb",
          padding: "40px 0",
          background: "#f9fafb",
        }}
      >
        <div className="container">
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#9ca3af",
              marginBottom: "16px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Tài nguyên hữu ích
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            {[
              { href: "/nguon-hang", label: "Nguồn hàng sỉ B2B" },
              { href: "/oem", label: "OEM & Private Label" },
              { href: "/qua-tang-doanh-nghiep", label: "Quà tặng doanh nghiệp" },
              { href: "/chinh-sach-dai-ly", label: "Chính sách đại lý" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#374151",
                  textDecoration: "none",
                  background: "#fff",
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Back to blog */}
      <div
        style={{
          padding: "32px 0",
          borderTop: related.length === 0 ? "1px solid #e5e7eb" : undefined,
        }}
      >
        <div className="container">
          <Link
            href="/blog"
            style={{
              fontSize: "14px",
              color: "#6b7280",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            ← Quay lại Blog
          </Link>
        </div>
      </div>
    </main>
  );
}
