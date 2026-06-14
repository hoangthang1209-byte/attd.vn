import {
  addHeadingIds,
  type TocHeading,
} from "@/features/blog/content-processor";
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

  const withIds = addHeadingIds(content);
  const linked = applyInternalLinks(withIds.html, 5);

  return {
    html: linked.html,
    headings: withIds.headings,
    internalLinkCount: linked.count,
  };
}
