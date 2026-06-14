import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPostsByCategorySlug } from "@/features/blog/services/blog-public.service";
import { SITE_NAME, canonicalUrl } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

const PER_PAGE = 9;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedPostsByCategorySlug(slug, 1, 1);
  if (!result) return {};

  const title = `${result.category.name} | Blog | ${SITE_NAME}`;
  const description =
    result.category.description ??
    `Bài viết về ${result.category.name} — kiến thức B2B từ ATTD.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl(`/blog/danh-muc/${slug}`),
    },
  };
}

export default async function BlogCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));

  const result = await getPublishedPostsByCategorySlug(slug, currentPage, PER_PAGE);
  if (!result) notFound();

  const { category, posts, total, totalPages } = result;

  return (
    <main>
      <section className="section" style={{ paddingBottom: "24px" }}>
        <div className="container">
          <nav
            style={{
              fontSize: "13px",
              color: "#6b7280",
              marginBottom: "16px",
              display: "flex",
              gap: "6px",
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
            <span>/</span>
            <span style={{ color: "#111827" }}>{category.name}</span>
          </nav>

          <h1 className="section-title">{category.name}</h1>
          {category.description && (
            <p className="section-description">{category.description}</p>
          )}
        </div>
      </section>

      <section style={{ paddingBottom: "64px" }}>
        <div className="container">
          {posts.length === 0 ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: "48px 0" }}>
              Chưa có bài viết trong danh mục này.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "24px",
                marginBottom: "48px",
              }}
            >
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <article
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      overflow: "hidden",
                      background: "#fff",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {post.featuredImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.featuredImageUrl}
                        alt={post.title}
                        style={{
                          width: "100%",
                          height: "200px",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div style={{ height: "200px", background: "#f3f4f6" }} />
                    )}

                    <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                      <time
                        dateTime={new Date(post.publishedAt ?? post.createdAt).toISOString()}
                        style={{ fontSize: "12px", color: "#9ca3af" }}
                      >
                        {formatDate(post.publishedAt ?? post.createdAt)}
                      </time>
                      <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#111827" }}>
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p
                          style={{
                            fontSize: "14px",
                            color: "#6b7280",
                            lineHeight: 1.6,
                            margin: 0,
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {post.excerpt}
                        </p>
                      )}
                      <span style={{ marginTop: "auto", fontSize: "13px", color: "#6b7280", fontWeight: 500 }}>
                        Đọc thêm →
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}>
              {currentPage > 1 && (
                <Link
                  href={`/blog/danh-muc/${slug}?page=${currentPage - 1}`}
                  style={{
                    padding: "8px 20px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "#374151",
                    textDecoration: "none",
                    background: "#fff",
                  }}
                >
                  ← Trước
                </Link>
              )}
              <span style={{ fontSize: "14px", color: "#6b7280" }}>
                Trang {currentPage} / {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/blog/danh-muc/${slug}?page=${currentPage + 1}`}
                  style={{
                    padding: "8px 20px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "#374151",
                    textDecoration: "none",
                    background: "#fff",
                  }}
                >
                  Tiếp →
                </Link>
              )}
            </div>
          )}

          {total > 0 && (
            <p style={{ textAlign: "center", fontSize: "13px", color: "#9ca3af", marginTop: "16px" }}>
              {total} bài viết
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
