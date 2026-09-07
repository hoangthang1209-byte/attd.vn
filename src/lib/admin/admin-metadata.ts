import type { Metadata } from "next";

/** Browser tab base name for the internal Admin app (not public SEO). */
export const ADMIN_DOCUMENT_TITLE = "ATTD Admin";

/** Title template for Admin layout: page segment + shared suffix. */
export const ADMIN_TITLE_TEMPLATE = `%s | ${ADMIN_DOCUMENT_TITLE}`;

/** Static metadata helper — page supplies only the short segment. */
export function adminPageMetadata(title: string): Metadata {
  return { title };
}
