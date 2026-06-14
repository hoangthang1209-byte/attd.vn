import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleSchema, { buildArticleDescription } from "@/components/seo/ArticleSchema";
import {
  getPublishedBlogPostBySlug,
  getRelatedBlogPosts,
  resolveBlogOgImage,
} from "@/features/blog/services/blog-public.service";
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
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post || post.status !== "PUBLISHED") return {};

  const title = post.metaTitle ?? `${post.title} | ${SITE_NAME}`;
  const description = buildArticleDescription(post.metaDescription, post.excerpt);
  const ogImage = await resolveBlogOgImage(post);
  const ogImages = buildOgImages(ogImage);
  const canonical =
    post.canonicalUrl?.trim() || canonicalUrl(`/blog/${slug}`);
  const publishedAt = post.publishedAt ?? post.createdAt;
  const modifiedAt = post.updatedAt;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: post.metaTitle ?? post.title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      images: ogImages,
      type: "article",
      publishedTime: publishedAt.toISOString(),
      modifiedTime: modifiedAt.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      images: ogImages,
    },
  };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [post, related] = await Promise.all([
    getPublishedBlogPostBySlug(slug),
    getRelatedBlogPosts(slug),
  ]);

  if (!post || post.status !== "PUBLISHED") notFound();

  const publishedAt = post.publishedAt ?? post.createdAt;
  const description = buildArticleDescription(post.metaDescription, post.excerpt);
  const heroImage = post.featuredImageUrl;
  const schemaImage = (await resolveBlogOgImage(post)) ?? heroImage ?? undefined;
  const categories = "categories" in post ? post.categories : [];

  return (
    <main>
      <ArticleSchema
        headline={post.title}
        description={description}
        slug={slug}
        image={schemaImage}
        datePublished={publishedAt.toISOString()}
        dateModified={post.updatedAt.toISOString()}
      />

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
            flexWrap: "wrap",
          }}
        >
          <Link href="/" style={{ color: "#6b7280", textDecoration: "none" }}>
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/blog" style={{ color: "#6b7280", textDecoration: "none" }}>
            Blog
          </Link>
          {categories.length > 0 && (
            <>
              <span>/</span>
              <Link
                href={`/blog/danh-muc/${categories[0].category.slug}`}
                style={{ color: "#6b7280", textDecoration: "none" }}
              >
                {categories[0].category.name}
              </Link>
            </>
          )}
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

      <article>
        <section className="section" style={{ paddingBottom: "32px" }}>
          <div className="container" style={{ maxWidth: "760px" }}>
            <time
              dateTime={publishedAt.toISOString()}
              style={{ fontSize: "13px", color: "#9ca3af" }}
            >
              {formatDate(publishedAt)}
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

            {heroImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImage}
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
                className="prose-blog"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            ) : (
              <p style={{ fontSize: "15px", color: "#9ca3af" }}>
                Nội dung đang được cập nhật.
              </p>
            )}
          </div>
        </section>
      </article>

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
                    {p.featuredImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.featuredImageUrl}
                        alt={p.title}
                        style={{
                          width: "100%",
                          height: "160px",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div style={{ height: "160px", background: "#f3f4f6" }} />
                    )}

                    <div style={{ padding: "16px" }}>
                      <time
                        dateTime={new Date(p.publishedAt ?? p.createdAt).toISOString()}
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
                        }).format(new Date(p.publishedAt ?? p.createdAt))}
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

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
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
