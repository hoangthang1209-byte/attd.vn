import { marked } from "marked";
import { processSeoBlocksInMarkdown } from "@/features/blog/seo-blocks";
import { sanitizeBlogHtml } from "@/features/blog/sanitize-html";

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

export function isHtmlContent(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content.trim());
}

export function normalizeBlogContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  if (isHtmlContent(trimmed)) return sanitizeBlogHtml(trimmed);

  const withBlocks = processSeoBlocksInMarkdown(trimmed);
  return sanitizeBlogHtml(markdownToHtml(withBlocks));
}
