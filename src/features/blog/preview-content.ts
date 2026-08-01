import { normalizeBlogContent } from "@/features/blog/content-normalizer";
import { prepareBlogArticleContent } from "@/features/blog/prepare-content";

/**
 * The admin preview must show exactly what the public page renders, so it runs
 * the same normalize → heading ids → internal links pipeline.
 */
export function renderBlogPreviewFromMarkdown(markdown: string): string {
  if (!markdown.trim()) return "";
  return prepareBlogArticleContent(normalizeBlogContent(markdown)).html;
}
