import type { InlineMediaVariant } from "@/features/content/inline-media/inline-media.types";

/**
 * Canonical figure markup for inline placements.
 * Always uses `data-media-id` (the sanitizer allowlist + metrics contract).
 * `src` is resolved at apply/render time from the MediaAsset — never treated
 * as the source of truth.
 */
export function buildInlineMediaFigureHtml(params: {
  mediaAssetId: string;
  url: string;
  altText: string;
  caption?: string | null;
  sourceCredit?: string | null;
  variant?: InlineMediaVariant;
  width?: number | null;
  height?: number | null;
  blockId?: string | null;
}): string {
  const alt = escapeAttr(params.altText.trim() || "Hình minh họa ATTD");
  const src = escapeAttr(params.url);
  const id = escapeAttr(params.mediaAssetId);
  const variant = params.variant ?? "CONTENT_WIDTH";
  const variantClass =
    variant === "FULL_WIDTH"
      ? "article-figure article-figure--full"
      : variant === "WIDE"
        ? "article-figure article-figure--wide"
        : "article-figure article-figure--content";

  const widthAttr = params.width ? ` width="${params.width}"` : "";
  const heightAttr = params.height ? ` height="${params.height}"` : "";
  const blockAttr = params.blockId ? ` data-inline-block-id="${escapeAttr(params.blockId)}"` : "";
  const variantAttr = ` data-inline-variant="${variant}"`;

  const credit = params.sourceCredit?.trim();
  const caption = params.caption?.trim();
  let figcaption = "";
  if (caption || credit) {
    const creditHtml = credit
      ? `<span class="article-figure__credit">Nguồn: ${escapeHtml(credit)}</span>`
      : "";
    figcaption = `\n  <figcaption class="article-figure__caption">${caption ? escapeHtml(caption) : ""}${creditHtml}</figcaption>`;
  }

  return `<figure class="${variantClass}" data-media-id="${id}"${blockAttr}${variantAttr}>\n  <img src="${src}" alt="${alt}"${widthAttr}${heightAttr} loading="lazy" />${figcaption}\n</figure>`;
}

/** @deprecated Prefer buildInlineMediaFigureHtml — kept as alias during migration. */
export function buildBlogInlineFigureHtml(params: {
  mediaAssetId: string;
  url: string;
  altText?: string | null;
  caption?: string | null;
}): string {
  return buildInlineMediaFigureHtml({
    mediaAssetId: params.mediaAssetId,
    url: params.url,
    altText: params.altText ?? "",
    caption: params.caption,
    variant: "CONTENT_WIDTH",
  });
}

export function extractInlineMediaIdsFromHtml(html: string): string[] {
  const ids: string[] = [];
  const pattern = /<(?:figure|img)\b[^>]*\bdata-media-(?:asset-)?id=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }
  return ids;
}

export function removeInlineFigureByBlockId(html: string, blockId: string): string {
  const escaped = blockId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html
    .replace(
      new RegExp(
        `<figure\\b[^>]*\\bdata-inline-block-id=["']${escaped}["'][^>]*>[\\s\\S]*?<\\/figure>`,
        "i",
      ),
      "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function removeInlineFigureByMediaId(html: string, mediaAssetId: string): string {
  const escaped = mediaAssetId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html
    .replace(
      new RegExp(
        `<figure\\b[^>]*\\bdata-media-(?:asset-)?id=["']${escaped}["'][^>]*>[\\s\\S]*?<\\/figure>`,
        "gi",
      ),
      "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
