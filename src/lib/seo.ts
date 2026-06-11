export const SITE_URL = "https://www.attd.vn";

export const SITE_NAME = "ATTD";

export const DEFAULT_DESCRIPTION =
  "Nguồn hàng B2B dành cho đại lý, xưởng in và doanh nghiệp.";

/**
 * Returns an absolute canonical URL for the given path.
 * e.g. canonicalUrl("/san-pham/ao-thun") → "https://www.attd.vn/san-pham/ao-thun"
 */
export function canonicalUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/**
 * Returns an OG image array with a fallback to NEXT_PUBLIC_DEFAULT_OG_IMAGE.
 * Never returns an array with a null/undefined entry.
 */
export function buildOgImages(imageUrl?: string | null): string[] {
  if (imageUrl) return [imageUrl];
  const fallback = process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE;
  return fallback ? [fallback] : [];
}
