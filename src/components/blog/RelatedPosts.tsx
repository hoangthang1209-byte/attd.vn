import Link from "next/link";

export type RelatedPostItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  categories: { id: string; name: string; slug: string }[];
};

type RelatedPostsProps = {
  posts: RelatedPostItem[];
};

export default function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="blog-related">
      <div className="container">
        <h2 className="blog-related-title">Bài viết liên quan</h2>
        <div className="blog-related-grid">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="blog-related-card">
              {post.featuredImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.featuredImageUrl}
                  alt={post.title}
                  className="blog-related-image"
                />
              ) : (
                <div className="blog-related-image blog-related-image--placeholder" />
              )}
              <div className="blog-related-body">
                {post.categories[0] && (
                  <span className="blog-related-category">{post.categories[0].name}</span>
                )}
                <h3 className="blog-related-post-title">{post.title}</h3>
                {post.excerpt && <p className="blog-related-excerpt">{post.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
