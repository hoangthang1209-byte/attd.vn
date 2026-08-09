/**
 * Revenue Mode R1 — shared cluster URLs / media for four educational drafts.
 * Blogs stay DRAFT until human publish. Hub links stay on commercial URLs only.
 */

import { buildInlineMediaFigureHtml } from "@/features/content/inline-media/inline-media-figure";

export const R1_SLUGS = {
  hub: "/ao-thun-tron-si",
  category: "/ao-thun-tron",
  warehouse: "/kho-ao-thun-tron",
  sourcing: "/nguon-hang-ao-thun-tron",
  contact: "/lien-he",
  regular: "/ao-thun-regular",
  oversize: "/ao-thun-oversized",
  article1: "/blog/cach-chon-nguon-ao-thun-tron-cho-xuong-in",
  article2: "/blog/ao-thun-cvc-tc-cotton-khac-nhau",
  article3: "/blog/chon-ao-tron-de-in-lua-dtf-va-theu",
  article4: "/blog/regular-hay-oversize-xuong-in-nen-nhap-form-nao",
} as const;

export const R1_MEDIA = {
  khoThun: {
    id: "cmqfkgz0p000ajq04d4ncp46i",
    url: "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/kho-si-ao-thun-hqz725e7qNJhSUHr3Zi3OO23VEHMmN.jpg",
    alt: "Áo thun trơn xếp trong kho sỉ ATTD",
  },
  khoOversize: {
    id: "cmqfkgww30009jq045rsg738o",
    url: "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/kho-si-ao-thun-oversize-9TqarU0glcvdA8EDNDBWMptmihAw0p.jpg",
    alt: "Áo thun oversize trơn xếp trong kho sỉ ATTD",
  },
  regularDetail: {
    id: "cmrutsrbf0001ie04kbhbwlcb",
    url: "https://res.cloudinary.com/dcgi9n5rw/image/upload/v1784648768/attd/products/chowlekh9ohczeneja44.jpg",
    alt: "Áo thun regular cao cấp — chi tiết sản phẩm ATTD",
  },
  khoPolo: {
    id: "cmqfkgv040008jq04y8jas69t",
    url: "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/kho-si-ao-polo-OuRMUyunFjP6MeQkJWCWfBMDCvqpse.jpg",
    alt: "Áo polo trơn xếp trong kho sỉ ATTD",
  },
} as const;

/** Canonical inline figure: data-media-id so editor + ContentMediaAssignment stay aligned. */
export function r1Figure(
  media: { id: string; url: string; alt: string },
  caption: string,
  opts?: { blockId?: string },
): string {
  return buildInlineMediaFigureHtml({
    mediaAssetId: media.id,
    url: media.url,
    altText: media.alt,
    caption,
    blockId: opts?.blockId ?? null,
    variant: "CONTENT_WIDTH",
  });
}

export function countWordsFromHtml(html: string): number {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").filter(Boolean).length;
}

export function countInternalLinks(html: string): number {
  return (html.match(/href="\/[^"]+"/g) || []).length;
}

export function countInlineImages(html: string): number {
  return (html.match(/<img\b/gi) || []).length;
}
