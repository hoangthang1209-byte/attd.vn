import { countPotentialInternalLinks } from "@/features/blog/internal-links";
import { renderBlogPreviewFromMarkdown } from "@/features/blog/preview-content";
import { isHtmlContent } from "@/features/blog/markdown";

export function internalLinkCount(content: string): number {
  if (!content.trim()) return 0;
  const html = isHtmlContent(content) ? content : renderBlogPreviewFromMarkdown(content);
  return countPotentialInternalLinks(html);
}
