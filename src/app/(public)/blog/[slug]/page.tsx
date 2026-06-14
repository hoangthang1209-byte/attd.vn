import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AuthorBox from "@/components/blog/AuthorBox";
import BlogFaqSection from "@/components/blog/BlogFaqSection";
import BlogTableOfContents from "@/components/blog/BlogTableOfContents";
import BlogTags from "@/components/blog/BlogTags";
import RelatedPosts from "@/components/blog/RelatedPosts";
import ArticleSchema, { buildArticleDescription } from "@/components/seo/ArticleSchema";
import FaqSchema from "@/components/seo/FaqSchema";
import { parseFaqJson, parseTagsJson } from "@/features/blog/content-processor";
import { prepareBlogArticleContent } from "@/features/blog/prepare-content";
import { calculateReadingTime, formatReadingTime } from "@/features/blog/reading-time";
import {
  getPublishedBlogPostBySlug,
  getRelatedBlogPosts,
  resolveBlogOgImage,
} from "@/features/blog/services/blog-public.service";
import { SITE_NAME, canonicalUrl, buildOgImages } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
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
  const canonical = post.canonicalUrl?.trim() || canonicalUrl(`/blog/${slug}`);
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
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post || post.status !== "PUBLISHED") notFound();

  const categoryIds =
    "categories" in post ? post.categories.map((item) => item.categoryId) : [];

  const related = await getRelatedBlogPosts(slug, categoryIds);

  const publishedAt = post.publishedAt ?? post.createdAt;
  const description = buildArticleDescription(post.metaDescription, post.excerpt);
  const heroImage = post.featuredImageUrl;
  const schemaImage = (await resolveBlogOgImage(post)) ?? heroImage ?? undefined;
  const categories = "categories" in post ? post.categories : [];
  const faqItems = parseFaqJson("faqJson" in post ? post.faqJson : []);
  const tags = parseTagsJson("tags" in post ? post.tags : []);
  const readingMinutes = calculateReadingTime(post.content);
  const processed = prepareBlogArticleContent(post.content);

  return (
    <main className="blog-article-page">
      <ArticleSchema
        headline={post.title}
        description={description}
        slug={slug}
        image={schemaImage}
        datePublished={publishedAt.toISOString()}
        dateModified={post.updatedAt.toISOString()}
      />
      {faqItems.length > 0 && <FaqSchema items={faqItems} />}

      <div className="blog-breadcrumb-bar">
        <div className="container blog-breadcrumb">
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <Link href="/blog">Blog</Link>
          {categories.length > 0 && (
            <>
              <span>/</span>
              <Link href={`/blog/danh-muc/${categories[0].category.slug}`}>
                {categories[0].category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="blog-breadcrumb-current">{post.title}</span>
        </div>
      </div>

      <article>
        <section className="section blog-article-section">
          <div className="container blog-article-container">
            <header className="blog-article-header">
              <div className="blog-article-meta">
                <time dateTime={publishedAt.toISOString()}>{formatDate(publishedAt)}</time>
                <span className="blog-article-meta-sep">•</span>
                <span>{formatReadingTime(readingMinutes)}</span>
              </div>

              <h1 className="blog-article-title">{post.title}</h1>

              {post.excerpt && <p className="blog-article-excerpt">{post.excerpt}</p>}

              {heroImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt={post.title} className="blog-article-hero" />
              )}
            </header>

            <div className="blog-article-layout">
              <BlogTableOfContents headings={processed.headings} />

              <div className="blog-article-body">
                {processed.html ? (
                  <div
                    className="prose-blog prose-blog--article"
                    dangerouslySetInnerHTML={{ __html: processed.html }}
                  />
                ) : (
                  <p className="blog-article-empty">Nội dung đang được cập nhật.</p>
                )}

                <BlogFaqSection items={faqItems} />
                <BlogTags tags={tags} />
                <AuthorBox />
              </div>
            </div>
          </div>
        </section>
      </article>

      <RelatedPosts posts={related} />

      <section className="blog-resource-links">
        <div className="container">
          <p className="blog-resource-links-label">Tài nguyên hữu ích</p>
          <div className="blog-resource-links-grid">
            {[
              { href: "/nguon-hang", label: "Nguồn hàng sỉ B2B" },
              { href: "/oem", label: "OEM & Private Label" },
              { href: "/qua-tang-doanh-nghiep", label: "Quà tặng doanh nghiệp" },
              { href: "/chinh-sach-dai-ly", label: "Chính sách đại lý" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="blog-resource-link">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="blog-back-link-wrap">
        <div className="container">
          <Link href="/blog" className="blog-back-link">
            ← Quay lại Blog
          </Link>
        </div>
      </div>
    </main>
  );
}
