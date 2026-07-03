import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicBlogCard from "@/components/blog/PublicBlogCard";
import { getPublishedPostsByCategorySlug } from "@/features/blog/services/blog-public.service";
import { SITE_NAME } from "@/lib/seo";
import { buildBlogCategoryMetadata } from "@/lib/seo/indexation-policy";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

const PER_PAGE = 9;

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const result = await getPublishedPostsByCategorySlug(slug, 1, 1);
  if (!result) return {};

  const title = `${result.category.name} | Blog | ${SITE_NAME}`;
  const description =
    result.category.description ??
    `Bài viết về ${result.category.name} — kiến thức B2B từ ATTD.`;

  return {
    title,
    description,
    ...buildBlogCategoryMetadata(slug, query),
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
    <main className="mp-blog-listing">
      <section className="section blog-category-hero">
        <div className="container">
          <nav className="blog-breadcrumb blog-category-breadcrumb" aria-label="Đường dẫn">
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <Link href="/blog">Blog</Link>
            <span>/</span>
            <span className="blog-breadcrumb-current">{category.name}</span>
          </nav>

          <h1 className="section-title">{category.name}</h1>
          {category.description && (
            <p className="section-description">{category.description}</p>
          )}
        </div>
      </section>

      <section className="mp-section blog-category-posts">
        <div className="container">
          {posts.length === 0 ? (
            <div className="mp-empty-text mp-blog-empty-state">
              <p>Chưa có bài viết trong danh mục này.</p>
              <Link href="/blog">Xem tất cả bài viết</Link>
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
                  href={`/blog/danh-muc/${slug}?page=${currentPage - 1}`}
                  className="mp-page-btn"
                >
                  ← Trước
                </Link>
              )}
              <span className="mp-page-info">Trang {currentPage} / {totalPages}</span>
              {currentPage < totalPages && (
                <Link
                  href={`/blog/danh-muc/${slug}?page=${currentPage + 1}`}
                  className="mp-page-btn"
                >
                  Tiếp →
                </Link>
              )}
            </div>
          )}

          {total > 0 && (
            <p className="mp-blog-total">{total} bài viết</p>
          )}
        </div>
      </section>
    </main>
  );
}
