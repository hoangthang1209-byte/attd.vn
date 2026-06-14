import { isHtmlContent } from "@/features/blog/markdown";
import { processSeoBlocksInMarkdown } from "@/features/blog/seo-blocks";
import { markdownToHtml } from "@/features/blog/markdown";
import { sanitizeBlogHtml } from "@/features/blog/sanitize-html";
import { prepareBlogArticleContent } from "@/features/blog/prepare-content";

export function renderBlogPreviewFromMarkdown(markdown: string): string {
  if (!markdown.trim()) return "";

  if (isHtmlContent(markdown)) {
    return prepareBlogArticleContent(sanitizeBlogHtml(markdown)).html;
  }

  const withBlocks = processSeoBlocksInMarkdown(markdown);
  const html = sanitizeBlogHtml(markdownToHtml(withBlocks));
  return prepareBlogArticleContent(html).html;
}
