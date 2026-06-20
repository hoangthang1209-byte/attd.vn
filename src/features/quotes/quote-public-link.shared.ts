import { SITE_URL } from "@/lib/seo";

export const QUOTE_PUBLIC_SHORT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const QUOTE_PUBLIC_LINK_REGEX =
  /^BG-(\d{6})-([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4})$/;

export type QuotePublicLinkParts = {
  quoteNo: string;
  publicShortCode: string;
};

export type QuotePublicLinkRecord = {
  quoteNo: string;
  publicShortCode: string | null;
};

export function parseQuotePublicLinkSegment(segment: string): QuotePublicLinkParts | null {
  const normalized = segment.trim().toUpperCase();
  const match = normalized.match(QUOTE_PUBLIC_LINK_REGEX);
  if (!match?.[2]) return null;
  return {
    quoteNo: `BG-${match[1]}`,
    publicShortCode: match[2],
  };
}

export function getQuotePublicPath(quote: QuotePublicLinkRecord): string | null {
  if (!quote.publicShortCode?.trim()) return null;
  return `/${quote.quoteNo}-${quote.publicShortCode.trim().toUpperCase()}`;
}

export function getQuotePublicUrl(
  quote: QuotePublicLinkRecord,
  baseUrl = SITE_URL,
): string | null {
  const path = getQuotePublicPath(quote);
  if (!path) return null;
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}${path}`;
}
