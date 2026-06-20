"use client";

/** Open visual quote PDF inline in browser (print/save from PDF viewer). */
export function openQuotePdfInlinePublic(publicToken: string): void {
  const url = `/api/quotes/public/${encodeURIComponent(publicToken)}/pdf?disposition=inline`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Open visual quote PDF inline for admin quote detail. */
export function openQuotePdfInlineAdmin(quoteId: string): void {
  const url = `/api/quotes/${encodeURIComponent(quoteId)}/pdf?disposition=inline`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function quotePdfDownloadUrlPublic(publicToken: string): string {
  return `/api/quotes/public/${encodeURIComponent(publicToken)}/pdf?disposition=attachment`;
}

export function quotePdfDownloadUrlAdmin(quoteId: string): string {
  return `/api/quotes/${encodeURIComponent(quoteId)}/pdf?disposition=attachment`;
}

/** @deprecated HTML autoprint fallback — use openQuotePdfInlinePublic instead. */
export function openQuoteDocumentPrintFallback(publicToken: string): void {
  const url = `/q/${encodeURIComponent(publicToken)}/document?mode=print&autoprint=1`;
  window.open(url, "_blank", "noopener,noreferrer");
}
