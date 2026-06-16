import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedBlogPosts } from "@/features/blog/services/blog-public.service";
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
  searchParams: Promise<{ page?: string; tag?: string }>;
}) {
  const { page: pageParam, tag } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));

  const { posts, total, totalPages, activeTag } = await getPublishedBlogPosts(
    currentPage,
    PER_PAGE,
    tag
  );

  return (
    <main>
      <section className="section" style={{ paddingBottom: "24px" }}>
        <div className="container">
          <h1 className="section-title">Blog</h1>
          <p className="section-description">
            Kiến thức đồng phục, quà tặng doanh nghiệp và nguồn hàng B2B.
          </p>
          {activeTag && (
            <p className="blog-list-tag-filter">
              Đang lọc theo tag: <strong>#{activeTag}</strong>{" "}
              <Link href="/blog">Xóa lọc</Link>
            </p>
          )}
        </div>
      </section>

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
            <div className="blog-card-grid">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="blog-card-premium"
                >
                  <article>
                    <div className="blog-card-premium-img">
                      {post.featuredImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.featuredImageUrl}
                          alt={post.title}
                          className="blog-card-premium-photo"
                        />
                      ) : (
                        <div className="blog-card-premium-placeholder" aria-hidden>
                          ATTD
                        </div>
                      )}
                    </div>

                    <div className="blog-card-premium-body">
                      <time
                        dateTime={new Date(post.publishedAt ?? post.createdAt).toISOString()}
                        className="blog-card-premium-date"
                      >
                        {formatDate(post.publishedAt ?? post.createdAt)}
                      </time>

                      <h2 className="blog-card-premium-title">{post.title}</h2>

                      {post.excerpt && (
                        <p className="blog-card-premium-excerpt">{post.excerpt}</p>
                      )}

                      <span className="blog-card-premium-link">Đọc thêm →</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}

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
                  href={`/blog?${new URLSearchParams({
                    ...(activeTag ? { tag: activeTag } : {}),
                    page: String(currentPage - 1),
                  }).toString()}`}
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
                  href={`/blog?${new URLSearchParams({
                    ...(activeTag ? { tag: activeTag } : {}),
                    page: String(currentPage + 1),
                  }).toString()}`}
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
