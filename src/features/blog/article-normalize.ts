/**
 * Defensive normalization applied before any article is rendered.
 *
 * Some published bodies were written by an older handoff sanitizer that
 * deleted every `</a>` while keeping the opening tag, so the browser extended
 * each anchor across the rest of the document. This module repairs that class
 * of damage at render time; it never writes back to the stored body.
 */
import {
  CONVERSION_HREFS,
  DEFAULT_CTA_BUTTON,
  DEFAULT_CTA_TITLE,
  renderArticleCtaHtml,
} from "@/features/blog/article-cta";

/** Inline elements may live inside an anchor without ending it. */
const INLINE_TAGS = new Set([
  "b",
  "br",
  "code",
  "em",
  "i",
  "img",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "u",
  "wbr",
]);

const UNSAFE_URL = /^\s*(javascript|vbscript|data):/i;

export type AnchorRepairReport = {
  html: string;
  /** Anchors that were missing a closing tag and got one. */
  closed: number;
  /** Nested anchors that were flattened. */
  unnested: number;
  /** Anchors dropped for having no usable href or no text. */
  dropped: number;
};

function hrefOf(tag: string): string | null {
  const match = tag.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const value = match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
  if (!value) return null;
  if (UNSAFE_URL.test(value)) return null;
  return value;
}

/**
 * Close unbalanced anchors at their enclosing block boundary and flatten
 * nested ones. An anchor can never legally span a block element, so the
 * boundary is a safe, deterministic place to close it.
 */
export function repairAnchors(html: string, anchorTextHints?: Map<string, string[]>): AnchorRepairReport {
  if (!html.includes("<a")) {
    return { html, closed: 0, unnested: 0, dropped: 0 };
  }

  const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  const out: string[] = [];
  let cursor = 0;
  let anchorOpen = false;
  let pendingHint: string | null = null;
  let closed = 0;
  let unnested = 0;
  let dropped = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    const [full, closing, rawName] = match;
    const name = rawName.toLowerCase();
    let text = html.slice(cursor, match.index);

    // An unclosed anchor whose intended anchor text is known ends right there.
    if (anchorOpen && text && pendingHint && text.startsWith(pendingHint)) {
      out.push(pendingHint, "</a>", text.slice(pendingHint.length));
      anchorOpen = false;
      pendingHint = null;
      closed += 1;
      text = "";
    }

    if (text) out.push(text);
    cursor = match.index + full.length;

    if (name === "a" && !closing) {
      const href = hrefOf(full);
      if (anchorOpen) {
        out.push("</a>");
        anchorOpen = false;
        unnested += 1;
      }
      if (!href) {
        dropped += 1;
        continue;
      }
      pendingHint = pickHint(anchorTextHints, href, html.slice(cursor));
      out.push(full);
      anchorOpen = true;
      continue;
    }

    if (name === "a" && closing) {
      if (anchorOpen) {
        out.push(full);
        anchorOpen = false;
        pendingHint = null;
      }
      continue;
    }

    // Any block-level boundary terminates an anchor that is still open.
    if (anchorOpen && !INLINE_TAGS.has(name)) {
      out.push("</a>");
      anchorOpen = false;
      pendingHint = null;
      closed += 1;
    }

    out.push(full);
  }

  if (cursor < html.length) out.push(html.slice(cursor));
  if (anchorOpen) {
    out.push("</a>");
    closed += 1;
  }

  let repaired = out.join("");

  // An anchor with no visible text is noise for readers and crawlers alike.
  repaired = repaired.replace(/<a\b[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/a>/gi, () => {
    dropped += 1;
    return "";
  });

  return { html: repaired, closed, unnested, dropped };
}

function pickHint(
  hints: Map<string, string[]> | undefined,
  href: string,
  rest: string,
): string | null {
  const candidates = hints?.get(href);
  if (!candidates?.length) return null;
  // Longest match first so "áo polo trơn sỉ" wins over "áo polo trơn".
  const sorted = [...candidates].sort((a, b) => b.length - a.length);
  return sorted.find((candidate) => rest.startsWith(candidate)) ?? null;
}

/**
 * Remove visible markdown link debris such as a stray `](/lien-he)` left
 * behind when a conversion dropped the opening bracket.
 */
export function stripOrphanLinkFragments(html: string): { html: string; removed: number } {
  let removed = 0;

  const cleaned = html
    // `](/path)` or `](https://…)` with no matching `[`
    .replace(/(^|[^\]])\]\(\s*([^()\s]*)\s*\)/g, (full, prefix: string) => {
      removed += 1;
      return prefix;
    })
    // A lone `[` or `]` that survived on its own between whitespace
    .replace(/(^|\s)[[\]](?=\s|$)/g, (full, prefix: string) => {
      removed += 1;
      return prefix;
    });

  return { html: cleaned, removed };
}

function foldHeading(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Headings that announce an in-body FAQ block. */
const FAQ_HEADINGS = new Set(["cau hoi thuong gap", "faq", "cac cau hoi thuong gap"]);

/** Conversion blocks: real content, but they must not appear in the TOC. */
const NON_TOC_HEADINGS = new Set([
  "cau hoi thuong gap",
  "faq",
  "lien he dat hang",
  "yeu cau tu van va bao gia",
  "lien he",
]);

export function isNonTocHeading(text: string): boolean {
  return NON_TOC_HEADINGS.has(foldHeading(text));
}

/**
 * A paragraph whose entire content is one conversion link is a CTA the writer
 * expressed as plain prose. Promote it to the shared CTA block so it reads as
 * a card instead of a stray blue sentence.
 */
export function promoteBareCtaParagraphs(html: string): { html: string; promoted: number } {
  let promoted = 0;

  const result = html.replace(
    /<p\b[^>]*>\s*<a\b([^>]*)>([\s\S]*?)<\/a>\s*<\/p>/gi,
    (full, attrs: string, inner: string) => {
      const href = hrefOf(`<a${attrs}>`);
      if (!href || !CONVERSION_HREFS.has(href)) return full;
      if (/<a\b/i.test(inner)) return full;

      const text = inner.replace(/<[^>]+>/g, "").trim();
      if (!text) return full;

      promoted += 1;
      // Short text reads as a button label; a full sentence reads as body copy.
      const isSentence = text.length > 60;
      return renderArticleCtaHtml({
        title: DEFAULT_CTA_TITLE,
        body: isSentence ? inner.trim() : undefined,
        href,
        buttonLabel: isSentence ? DEFAULT_CTA_BUTTON : text,
      });
    },
  );

  return { html: result, promoted };
}

/**
 * Media references that never resolved to an asset leave an empty `<figure>`
 * whose caption ("ATTD media") renders as stray text mid-article.
 */
export function dropEmptyMediaFigures(html: string): { html: string; removed: number } {
  let removed = 0;

  const result = html.replace(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi, (full, inner: string) => {
    if (/<(img|picture|video|iframe)\b/i.test(inner)) return full;
    removed += 1;
    return "";
  });

  return { html: result, removed };
}

/**
 * Older handoffs unwrapped the draft's `<h1>` instead of removing it, leaving
 * the article title as loose text above the first section. The page already
 * renders the title in its header, so this echo is a duplicate.
 */
export function dropLeadingTitleEcho(
  html: string,
  title: string | null | undefined,
): { html: string; removed: boolean } {
  const wanted = foldHeading(title ?? "");
  if (!wanted) return { html, removed: false };

  const firstBlock = html.search(/<(?:h[1-6]|p|ul|ol|table|figure|aside|section|div|blockquote|pre)\b/i);
  const lead = firstBlock === -1 ? html : html.slice(0, firstBlock);
  if (lead.trim() && foldHeading(lead) === wanted) {
    return { html: html.slice(firstBlock === -1 ? html.length : firstBlock), removed: true };
  }

  // The same echo, but wrapped in a paragraph or heading.
  const wrapped = html.match(/^\s*<(p|h1|h2)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (wrapped && foldHeading(wrapped[2]) === wanted) {
    return { html: html.slice(wrapped[0].length).trimStart(), removed: true };
  }

  return { html, removed: false };
}

type Block = { start: number; end: number; tag: string; inner: string };

/** Split a document into its top-level block elements. */
function topLevelBlocks(html: string): Block[] {
  const pattern = /<(h[1-6]|p|ul|ol|table|figure|aside|section|div|blockquote|pre|details)\b[^>]*>/gi;
  const blocks: Block[] = [];
  let match: RegExpExecArray | null;
  let guard = 0;

  while ((match = pattern.exec(html)) !== null && guard++ < 5000) {
    const tag = match[1].toLowerCase();
    const closePattern = new RegExp(`</${tag}\\s*>`, "gi");
    closePattern.lastIndex = match.index + match[0].length;
    const close = closePattern.exec(html);
    const end = close ? close.index + close[0].length : html.length;

    blocks.push({
      start: match.index,
      end,
      tag,
      inner: html.slice(match.index + match[0].length, close?.index ?? html.length),
    });

    pattern.lastIndex = end;
  }

  return blocks;
}

/**
 * Drop in-body FAQ blocks when `faqJson` already carries the canonical FAQ.
 * Without this the same questions render three times: as body headings, as the
 * accordion, and inside the FAQ JSON-LD.
 *
 * Only blocks that restate a canonical question (and the answer directly
 * following it) are removed, so a CTA or figure sitting after the FAQ survives.
 */
export function removeInlineFaqSections(
  html: string,
  canonicalQuestions: string[] = [],
): { html: string; removed: number } {
  const questions = new Set(canonicalQuestions.map(foldHeading).filter(Boolean));
  const blocks = topLevelBlocks(html);
  const cuts: Array<{ start: number; end: number }> = [];
  let removed = 0;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.tag !== "h2" || !FAQ_HEADINGS.has(foldHeading(block.inner))) continue;

    let end = block.end;
    let cursor = index + 1;

    while (cursor < blocks.length) {
      const next = blocks[cursor];
      if (next.tag === "h2") break;

      const isQuestionHeading = next.tag === "h3" && questions.has(foldHeading(next.inner));
      const leadingStrong = next.inner.match(/^\s*<strong>([\s\S]*?)<\/strong>/i)?.[1];
      const isQuestionParagraph =
        next.tag === "p" && Boolean(leadingStrong) && questions.has(foldHeading(leadingStrong!));

      if (isQuestionHeading || isQuestionParagraph) {
        end = next.end;
        cursor += 1;
        // A bare answer paragraph belongs to the question that precedes it.
        const answer = blocks[cursor];
        if (isQuestionHeading && answer?.tag === "p") {
          end = answer.end;
          cursor += 1;
        }
        continue;
      }

      break;
    }

    // Only remove the heading when it actually introduced duplicated questions.
    if (end === block.end) continue;

    cuts.push({ start: block.start, end });
    removed += 1;
    index = cursor - 1;
  }

  if (cuts.length === 0) return { html, removed: 0 };

  let result = "";
  let cursor = 0;
  for (const cut of cuts) {
    result += html.slice(cursor, cut.start);
    cursor = cut.end;
  }
  result += html.slice(cursor);

  return { html: result.replace(/\n{3,}/g, "\n\n").trim(), removed };
}
