/**
 * Client-safe helpers for parsing inline media figure HTML islands
 * that live inside the Blog editor markdown string.
 */

import { buildInlineMediaFigureHtml } from "@/features/content/inline-media/inline-media-figure";

export type ParsedInlineFigure = {
  mediaAssetId: string;
  blockId: string | null;
  variant: "CONTENT_WIDTH" | "WIDE" | "FULL_WIDTH";
  altText: string;
  caption: string | null;
  sourceCredit: string | null;
  src: string | null;
  width: number | null;
  height: number | null;
};

const FIGURE_RE =
  /<figure\b[^>]*\bdata-media-(?:asset-)?id=["']([^"']+)["'][^>]*>[\s\S]*?<\/figure>/i;

export function isInlineMediaFigureChunk(raw: string): boolean {
  return FIGURE_RE.test(raw.trim());
}

function attr(html: string, name: string): string | null {
  const match = html.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"));
  return match?.[1] ?? null;
}

export function parseInlineMediaFigure(raw: string): ParsedInlineFigure | null {
  const trimmed = raw.trim();
  if (!FIGURE_RE.test(trimmed)) return null;

  const mediaAssetId = attr(trimmed, "data-media-id") ?? attr(trimmed, "data-media-asset-id");
  if (!mediaAssetId) return null;

  const variantRaw = attr(trimmed, "data-inline-variant");
  const variant =
    variantRaw === "WIDE" || variantRaw === "FULL_WIDTH" || variantRaw === "CONTENT_WIDTH"
      ? variantRaw
      : trimmed.includes("article-figure--wide")
        ? "WIDE"
        : trimmed.includes("article-figure--full")
          ? "FULL_WIDTH"
          : "CONTENT_WIDTH";

  const imgMatch = trimmed.match(/<img\b[^>]*>/i)?.[0] ?? "";
  const altText = attr(imgMatch, "alt") ?? "";
  const src = attr(imgMatch, "src");
  const widthRaw = attr(imgMatch, "width");
  const heightRaw = attr(imgMatch, "height");

  const captionMatch = trimmed.match(
    /<figcaption\b[^>]*class=["'][^"']*article-figure__caption[^"']*["'][^>]*>([\s\S]*?)<\/figcaption>/i,
  );
  let caption: string | null = null;
  let sourceCredit: string | null = null;
  if (captionMatch) {
    const creditMatch = captionMatch[1].match(
      /<span\b[^>]*class=["'][^"']*article-figure__credit[^"']*["'][^>]*>Nguồn:\s*([\s\S]*?)<\/span>/i,
    );
    sourceCredit = creditMatch ? stripTags(creditMatch[1]).trim() || null : null;
    caption =
      stripTags(captionMatch[1].replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi, "")).trim() || null;
  }

  return {
    mediaAssetId,
    blockId: attr(trimmed, "data-inline-block-id"),
    variant,
    altText,
    caption,
    sourceCredit,
    src,
    width: widthRaw ? Number(widthRaw) || null : null,
    height: heightRaw ? Number(heightRaw) || null : null,
  };
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Patch figure HTML attributes / caption / alt in place. */
export function patchInlineMediaFigureHtml(
  raw: string,
  patch: {
    altText?: string;
    caption?: string | null;
    sourceCredit?: string | null;
    variant?: ParsedInlineFigure["variant"];
    src?: string;
    mediaAssetId?: string;
    blockId?: string | null;
    width?: number | null;
    height?: number | null;
  },
): string {
  const parsed = parseInlineMediaFigure(raw);
  if (!parsed) return raw;

  return buildInlineMediaFigureHtml({
    mediaAssetId: patch.mediaAssetId ?? parsed.mediaAssetId,
    url: patch.src ?? parsed.src ?? "",
    altText: patch.altText ?? parsed.altText,
    caption: patch.caption !== undefined ? patch.caption : parsed.caption,
    sourceCredit:
      patch.sourceCredit !== undefined ? patch.sourceCredit : parsed.sourceCredit,
    variant: patch.variant ?? parsed.variant,
    width: patch.width !== undefined ? patch.width : parsed.width,
    height: patch.height !== undefined ? patch.height : parsed.height,
    blockId: patch.blockId !== undefined ? patch.blockId : parsed.blockId,
  });
}
