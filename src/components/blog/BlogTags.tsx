import Link from "next/link";
import { tagToSlug } from "@/features/blog/content-processor";

type BlogTagsProps = {
  tags: string[];
};

export default function BlogTags({ tags }: BlogTagsProps) {
  if (tags.length === 0) return null;

  return (
    <section className="blog-tags">
      <h2 className="blog-tags-title">Chủ đề liên quan</h2>
      <div className="blog-tags-list">
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/blog?tag=${encodeURIComponent(tagToSlug(tag))}`}
            className="blog-tag"
          >
            #{tagToSlug(tag)}
          </Link>
        ))}
      </div>
    </section>
  );
}
