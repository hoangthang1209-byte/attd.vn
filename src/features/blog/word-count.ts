import { countWordsFromHtml } from "@/features/blog/content-processor";
import { isHtmlContent } from "@/features/blog/markdown";

export function countWordsFromMarkdown(markdown: string): number {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/:::cta[\s\S]*?:::/g, " ")
    .replace(/:::faq[\s\S]*?:::/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[|*_~`>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

export function countH2InContent(content: string): number {
  if (isHtmlContent(content)) {
    return (content.match(/<h2[\s>]/gi) ?? []).length;
  }
  return (content.match(/^##\s+/gm) ?? []).length;
}

export function countWordsInContent(content: string): number {
  if (!content.trim()) return 0;
  if (isHtmlContent(content)) return countWordsFromHtml(content);
  return countWordsFromMarkdown(content);
}
