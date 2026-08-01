import { analyzeBlogContent } from "@/features/blog/content-metrics";

/**
 * Canonical internal-link count: links the reader will actually see, i.e.
 * links authored in the body plus the ones the public page auto-injects.
 */
export function internalLinkCount(content: string): number {
  if (!content.trim()) return 0;
  return analyzeBlogContent({ content }).internalLinks.total;
}
