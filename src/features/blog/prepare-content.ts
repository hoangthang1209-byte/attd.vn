import {
  addHeadingIds,
  type TocHeading,
} from "@/features/blog/content-processor";
import {
  hasMarkdownLeak,
  normalizeMarkdownIslands,
} from "@/features/blog/content-normalizer";
import { applyInternalLinks } from "@/features/blog/internal-links";

export type ProcessedBlogContent = {
  html: string;
  headings: TocHeading[];
  internalLinkCount: number;
};

export function prepareBlogArticleContent(content: string | null | undefined): ProcessedBlogContent {
  if (!content?.trim()) {
    return { html: "", headings: [], internalLinkCount: 0 };
  }

  // Legacy rows may still hold markdown; never render it as literal text.
  const html = hasMarkdownLeak(content) ? normalizeMarkdownIslands(content) : content;
  const withIds = addHeadingIds(html);
  const linked = applyInternalLinks(withIds.html, 5);

  return {
    html: linked.html,
    headings: withIds.headings,
    internalLinkCount: linked.count,
  };
}
