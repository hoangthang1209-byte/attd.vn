import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/features/posts/services/post.service";
import { SITE_NAME, canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Blog | ${SITE_NAME}`,
  description:
    "Kiến thức đồng phục, quà tặng doanh nghiệp và nguồn hàng B2B.",
  alternates: {
    canonical: canonicalUrl("/blog"),
  },
};

const PER_PAGE = 9;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));

  const { posts, total, totalPages } = await getPublishedPosts(
    currentPage,
    PER_PAGE
  );

  return (
    <main>
      {/* Hero */}
      <section className="section" style={{ paddingBottom: "24px" }}>
        <div className="container">
          <h1 className="section-title">Blog</h1>
          <p className="section-description">
            Kiến thức đồng phục, quà tặng doanh nghiệp và nguồn hàng B2B.
          </p>
        </div>
      </section>

      {/* Post grid */}
      <section style={{ paddingBottom: "64px" }}>
        <div className="container">
          {posts.length === 0 ? (
            <div
              style={{
                padding: "80px 0",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: "15px",
              }}
            >
              Chưa có bài viết nào.
            </div>
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
                      transition: "box-shadow 0.2s",
                    }}
                  >
                    {/* Cover image */}
                    {post.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        style={{
                          width: "100%",
                          height: "200px",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: "200px",
                          background: "#f3f4f6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#d1d5db",
                          fontSize: "13px",
                        }}
                      >
                        ATTD Blog
                      </div>
                    )}

                    <div
                      style={{
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        flex: 1,
                      }}
                    >
                      <time
                        dateTime={new Date(post.createdAt).toISOString()}
                        style={{ fontSize: "12px", color: "#9ca3af" }}
                      >
                        {formatDate(post.createdAt)}
                      </time>

                      <h2
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          lineHeight: 1.4,
                          color: "#111827",
                          margin: 0,
                        }}
                      >
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

                      <span
                        style={{
                          marginTop: "auto",
                          fontSize: "13px",
                          color: "#6b7280",
                          fontWeight: 500,
                        }}
                      >
                        Đọc thêm →
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                alignItems: "center",
              }}
            >
              {currentPage > 1 && (
                <Link
                  href={`/blog?page=${currentPage - 1}`}
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
                  href={`/blog?page=${currentPage + 1}`}
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
            <p
              style={{
                textAlign: "center",
                fontSize: "13px",
                color: "#9ca3af",
                marginTop: "16px",
              }}
            >
              {total} bài viết
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
