"use client";

import { useMemo } from "react";
import { renderBlogPreviewFromMarkdown } from "@/features/blog/preview-content";

type BlogCtaPreviewProps = {
  content: string;
};

/** Both `:::cta` authoring blocks and already-rendered CTA markup count. */
const CTA_SOURCES = [
  /:::cta\n[\s\S]*?:::/g,
  /<aside[^>]*class="[^"]*blog-cta-block[^"]*"[\s\S]*?<\/aside>/gi,
  /<a[^>]*class="[^"]*blog-cta-block__button[^"]*"[\s\S]*?<\/a>/gi,
];

function extractCtaMarkup(content: string): string {
  const found: string[] = [];
  for (const pattern of CTA_SOURCES) {
    const matches = content.match(pattern);
    if (matches) found.push(...matches);
  }
  return found.join("\n\n");
}

/**
 * Shows the CTA the reader will see instead of a "CTA Ready" boolean. It reuses
 * the public render pipeline, so what appears here is what ships.
 */
export default function BlogCtaPreview({ content }: BlogCtaPreviewProps) {
  const html = useMemo(() => {
    const source = extractCtaMarkup(content);
    return source ? renderBlogPreviewFromMarkdown(source) : "";
  }, [content]);

  return (
    <div className="blog-cta-preview">
      <p className="blog-readiness-group__title">CTA</p>
      {html ? (
        <div
          className="blog-cta-preview__stage prose-blog prose-blog--article"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="admin-field-hint">CTA Missing — chèn khối CTA để hiển thị ở đây.</p>
      )}
    </div>
  );
}
