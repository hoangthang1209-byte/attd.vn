import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPublishedBlogPosts } from "@/features/blog/services/blog-public.service";
import MarketplaceSectionHeader from "@/components/marketplace/MarketplaceSectionHeader";
import MarketplaceFinalCta from "@/components/marketplace/MarketplaceFinalCta";
import { SITE_NAME, canonicalUrl } from "@/lib/seo";
import { isValidImageSrc } from "@/lib/imagePaths";

export const metadata: Metadata = {
  title: `Blog | ${SITE_NAME}`,
  description: "Kiến thức đồng phục, quà tặng doanh nghiệp và nguồn hàng B2B.",
  alternates: { canonical: canonicalUrl("/blog") },
};

const PER_PAGE = 9;

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
    <main className="mp-blog-listing">
      <section className="mp-section mp-section--compact">
        <div className="container">
          <MarketplaceSectionHeader
            title="Kiến thức nguồn hàng B2B"
            description="Hướng dẫn chọn sản phẩm, chất liệu và chiến lược sourcing cho đại lý."
            actionHref="/san-pham"
            actionLabel="Xem danh mục sản phẩm"
          />
          {activeTag && (
            <p className="mp-blog-tag-filter">
              Đang lọc theo tag: <strong>#{activeTag}</strong>{" "}
              <Link href="/blog">Xóa lọc</Link>
            </p>
          )}
        </div>
      </section>

      <section className="mp-section">
        <div className="container">
          {posts.length === 0 ? (
            <p className="mp-empty-text">Chưa có bài viết nào.</p>
          ) : (
            <div className="mp-blog-grid">
              {posts.map((post) => {
                const imgUrl =
                  typeof post.featuredImageUrl === "string" && isValidImageSrc(post.featuredImageUrl)
                    ? post.featuredImageUrl
                    : null;
                const date = post.publishedAt ?? post.createdAt;
                return (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="mp-blog-card">
                    <div className="mp-blog-card-img">
                      {imgUrl ? (
                        <Image src={imgUrl} alt={post.title} fill className="mp-blog-card-photo" sizes="400px" />
                      ) : (
                        <div className="mp-blog-card-placeholder"><span>ATTD</span></div>
                      )}
                    </div>
                    <div className="mp-blog-card-body">
                      <time dateTime={new Date(date).toISOString()} className="mp-blog-card-date">
                        {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date))}
                      </time>
                      <h2 className="mp-blog-card-title">{post.title}</h2>
                      {post.excerpt && <p className="mp-blog-card-excerpt">{post.excerpt}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mp-catalog-pagination">
              {currentPage > 1 && (
                <Link
                  href={`/blog?${new URLSearchParams({ ...(activeTag ? { tag: activeTag } : {}), page: String(currentPage - 1) }).toString()}`}
                  className="mp-page-btn"
                >
                  Trang trước
                </Link>
              )}
              <span className="mp-page-info">Trang {currentPage} / {totalPages}</span>
              {currentPage < totalPages && (
                <Link
                  href={`/blog?${new URLSearchParams({ ...(activeTag ? { tag: activeTag } : {}), page: String(currentPage + 1) }).toString()}`}
                  className="mp-page-btn"
                >
                  Trang tiếp
                </Link>
              )}
            </div>
          )}

          {total > 0 && <p className="mp-blog-total">{total} bài viết</p>}
        </div>
      </section>

      <MarketplaceFinalCta
        title="Cần nguồn hàng cho nội dung vừa đọc?"
        description="Liên hệ ATTD để được tư vấn sản phẩm, số lượng tối thiểu và báo giá sỉ."
      />
    </main>
  );
}
