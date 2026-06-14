import { isHtmlContent } from "@/features/blog/markdown";
import { htmlToMarkdown } from "@/features/blog/html-to-markdown";

function looksLikeMarkdown(text: string): boolean {
  return /(^|\n)(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|\|.+\|)/.test(text);
}

export function normalizePlainText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function normalizeMarkdownSpacing(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizePastedContent(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (isHtmlContent(trimmed)) {
    return normalizeMarkdownSpacing(htmlToMarkdown(trimmed));
  }

  if (looksLikeMarkdown(trimmed)) {
    return normalizeMarkdownSpacing(trimmed);
  }

  return normalizePlainText(trimmed);
}
