import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedBlogPosts } from "@/features/blog/services/blog-public.service";
import MarketplaceFinalCta from "@/components/marketplace/MarketplaceFinalCta";
import PublicBlogCard from "@/components/blog/PublicBlogCard";
import { SITE_NAME } from "@/lib/seo";
import { buildBlogIndexMetadata } from "@/lib/seo/indexation-policy";

const PER_PAGE = 9;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tag?: string; q?: string; search?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return {
    title: `Blog | ${SITE_NAME}`,
    description: "Kiến thức đồng phục, quà tặng doanh nghiệp và nguồn hàng B2B.",
    ...buildBlogIndexMetadata(params),
  };
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
    <main className="mp-blog-listing">
      <section className="mp-section mp-section--compact">
        <div className="container">
          <div className="mp-section-header mp-section-header--left mp-blog-listing-header">
            <div className="mp-section-header-copy">
              <h1 className="mp-section-title">Kiến thức nguồn hàng B2B</h1>
              <p className="mp-section-desc">
                Hướng dẫn chọn sản phẩm, chất liệu và chiến lược sourcing cho đại lý.
              </p>
            </div>
            <Link href="/san-pham" className="mp-section-action">
              Xem danh mục sản phẩm
            </Link>
          </div>
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
            <div className="mp-empty-text mp-blog-empty-state">
              <p>Chưa có bài viết phù hợp.</p>
              <Link href="/lien-he">Liên hệ ATTD để được tư vấn nguồn hàng</Link>
            </div>
          ) : (
            <div className="mp-blog-grid">
              {posts.map((post) => (
                <PublicBlogCard key={post.id} post={post} />
              ))}
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
