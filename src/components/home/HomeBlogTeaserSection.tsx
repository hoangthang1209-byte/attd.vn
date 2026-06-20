import Link from "next/link";
import Image from "next/image";
import MarketplaceSectionHeader from "@/components/marketplace/MarketplaceSectionHeader";
import type { HomepageBlogPostItem } from "@/features/home/homepage.types";

type Props = {
  posts: HomepageBlogPostItem[];
};

export default function HomeBlogTeaserSection({ posts }: Props) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="mp-section mp-section--tight">
      <div className="container">
        <MarketplaceSectionHeader
          title="Kiến thức nguồn hàng B2B"
          actionHref="/blog"
          actionLabel="Xem tất cả"
        />
        <div className="mp-blog-grid">
          {posts.map((post) => (
            <Link key={post.id} href={post.href} className="mp-blog-card">
              <div className="mp-blog-card-img">
                {post.imageUrl ? (
                  <Image
                    src={post.imageUrl}
                    alt={post.title}
                    fill
                    className="mp-blog-card-photo"
                    sizes="400px"
                  />
                ) : (
                  <div className="mp-blog-card-placeholder">
                    <span>ATTD</span>
                  </div>
                )}
              </div>
              <div className="mp-blog-card-body mp-blog-card-body--minimal">
                <h3 className="mp-blog-card-title">{post.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
