"use client";

/** Open document-only quote page and trigger browser print. */
export function openQuoteDocumentPrint(publicToken: string): void {
  const url = `/q/${encodeURIComponent(publicToken)}/document?mode=print&autoprint=1`;
  window.open(url, "_blank", "noopener,noreferrer");
}
