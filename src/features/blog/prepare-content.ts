import {
  addHeadingIds,
  type TocHeading,
} from "@/features/blog/content-processor";
import {
  hasMarkdownLeak,
  normalizeMarkdownIslands,
} from "@/features/blog/content-normalizer";
import {
  dropEmptyMediaFigures,
  dropLeadingTitleEcho,
  isNonTocHeading,
  promoteBareCtaParagraphs,
  removeInlineFaqSections,
  repairAnchors,
  stripOrphanLinkFragments,
} from "@/features/blog/article-normalize";
import { applyInternalLinks } from "@/features/blog/internal-links";

export type ProcessedBlogContent = {
  html: string;
  /** Headings safe to show in the table of contents. */
  headings: TocHeading[];
  internalLinkCount: number;
};

export type PrepareBlogContentOptions = {
  /**
   * Questions from `faqJson`. When present they are the canonical FAQ, so any
   * in-body block restating them is a duplicate of the accordion and the
   * FAQ JSON-LD and is dropped from the article body.
   */
  canonicalFaqQuestions?: string[];
  /**
   * The article title as the page header renders it. Used only to strip a
   * duplicate of it from the top of the body.
   */
  title?: string | null;
};

/**
 * The single render contract shared by the public article, the editor preview
 * and the publishing preview. Every caller gets the same normalization, so a
 * fix here reaches all three surfaces at once.
 *
 * This never mutates the stored body: it returns a repaired copy.
 */
export function prepareBlogArticleContent(
  content: string | null | undefined,
  options: PrepareBlogContentOptions = {},
): ProcessedBlogContent {
  if (!content?.trim()) {
    return { html: "", headings: [], internalLinkCount: 0 };
  }

  // Legacy rows may still hold markdown; never render it as literal text.
  let html = hasMarkdownLeak(content) ? normalizeMarkdownIslands(content) : content;

  html = dropLeadingTitleEcho(html, options.title).html;

  if (options.canonicalFaqQuestions?.length) {
    html = removeInlineFaqSections(html, options.canonicalFaqQuestions).html;
  }

  // Older handoffs stored anchors with no closing tag, which makes the browser
  // swallow every following paragraph into the link.
  html = repairAnchors(html).html;
  html = stripOrphanLinkFragments(html).html;
  html = dropEmptyMediaFigures(html).html;
  html = promoteBareCtaParagraphs(html).html;

  const withIds = addHeadingIds(html);
  const linked = applyInternalLinks(withIds.html, 5);

  return {
    html: linked.html,
    headings: withIds.headings.filter((heading) => !isNonTocHeading(heading.text)),
    internalLinkCount: linked.count,
  };
}
