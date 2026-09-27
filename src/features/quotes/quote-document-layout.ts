/** Use a readable product summary when a short quote has no design thumbnails. */
export function isCompactQuoteDocument(
  quote: { items: Array<{ designImageUrl?: string | null }> },
): boolean {
  return quote.items.length > 0 &&
    quote.items.length <= 3 &&
    quote.items.every((item) => !item.designImageUrl?.trim());
}
