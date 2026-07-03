import Image from "next/image";
import Link from "next/link";
import { isValidImageSrc } from "@/lib/imagePaths";

type PublicBlogCardProps = {
  post: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    featuredImageUrl: string | null;
    publishedAt: Date | null;
    createdAt: Date;
  };
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export default function PublicBlogCard({ post }: PublicBlogCardProps) {
  const imageUrl =
    typeof post.featuredImageUrl === "string" && isValidImageSrc(post.featuredImageUrl)
      ? post.featuredImageUrl
      : null;
  const date = post.publishedAt ?? post.createdAt;

  return (
    <Link href={`/blog/${post.slug}`} className="mp-blog-card">
      <article className="mp-blog-card-article">
        <div className="mp-blog-card-img">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={post.title}
              fill
              className="mp-blog-card-photo"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 380px"
            />
          ) : (
            <div className="mp-blog-card-placeholder">
              <span>ATTD</span>
            </div>
          )}
        </div>
        <div className="mp-blog-card-body">
          <time dateTime={new Date(date).toISOString()} className="mp-blog-card-date">
            {formatDate(date)}
          </time>
          <h2 className="mp-blog-card-title">{post.title}</h2>
          {post.excerpt && <p className="mp-blog-card-excerpt">{post.excerpt}</p>}
          <span className="mp-blog-card-link">Đọc bài viết</span>
        </div>
      </article>
    </Link>
  );
}
