"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { tagToSlug } from "@/features/blog/content-processor";

type BlogTagsProps = {
  tags: string[];
};

const VISIBLE_TAGS = 5;

/**
 * Some articles carry FAQ questions in their tag list. They stay stored and
 * linkable, but they read poorly as topic chips so they sort to the back.
 */
function byTopicRelevance(a: string, b: string): number {
  const aQuestion = a.trim().endsWith("?");
  const bQuestion = b.trim().endsWith("?");
  if (aQuestion !== bQuestion) return aQuestion ? 1 : -1;
  return 0;
}

export default function BlogTags({ tags }: BlogTagsProps) {
  const [expanded, setExpanded] = useState(false);

  const ordered = useMemo(() => [...tags].sort(byTopicRelevance), [tags]);

  if (ordered.length === 0) return null;

  const visible = expanded ? ordered : ordered.slice(0, VISIBLE_TAGS);
  const hidden = ordered.length - visible.length;

  return (
    <section className="blog-tags" aria-labelledby="blog-tags-title">
      <p className="blog-tags-title" id="blog-tags-title">
        Chủ đề liên quan
      </p>
      <div className="blog-tags-list">
        {visible.map((tag) => (
          <Link
            key={tag}
            href={`/blog?tag=${encodeURIComponent(tagToSlug(tag))}`}
            className="blog-tag"
          >
            {tag}
          </Link>
        ))}

        {hidden > 0 && (
          <button
            type="button"
            className="blog-tag blog-tag--more"
            aria-expanded={false}
            onClick={() => setExpanded(true)}
          >
            Xem thêm {hidden}
          </button>
        )}

        {expanded && ordered.length > VISIBLE_TAGS && (
          <button
            type="button"
            className="blog-tag blog-tag--more"
            aria-expanded
            onClick={() => setExpanded(false)}
          >
            Thu gọn
          </button>
        )}
      </div>
    </section>
  );
}
