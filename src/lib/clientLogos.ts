/** Client / partner logos — add entries with real images in /public/uploads/clients/ */

import { resolveUploadImage } from "@/lib/imagePaths";

export type ClientLogo = {
  id: string;
  /** Filename in /public/uploads/clients/ or full URL path */
  image: string;
  companyName: string;
  website?: string;
  isVisible: boolean;
};

export const CLIENT_LOGOS_SECTION = {
  title: "Khách hàng & đối tác",
  description:
    "Phục vụ đại lý, xưởng in, agency và doanh nghiệp trên toàn quốc.",
} as const;

/**
 * Add real client logos here. Example:
 * { id: "c1", image: "partner-a.png", companyName: "Công ty ABC", website: "https://...", isVisible: true }
 */
export const CLIENT_LOGOS: ClientLogo[] = [];

export type VisibleClientLogo = ClientLogo & { imageSrc: string };

/** Visible entries that have a resolvable image — no placeholders shown publicly. */
export function getVisibleClientLogos(): VisibleClientLogo[] {
  return CLIENT_LOGOS.filter((entry) => {
    if (!entry.isVisible) return false;
    const imageSrc = resolveUploadImage("clients", entry.image);
    return Boolean(imageSrc);
  }).map((entry) => ({
    ...entry,
    imageSrc: resolveUploadImage("clients", entry.image)!,
  }));
}

export function hasVisibleClientLogos(): boolean {
  return getVisibleClientLogos().length > 0;
}

/** Readiness: entries marked visible with image filename set. */
export function countClientLogoCandidates(): { total: number; withImage: number; visible: number } {
  const withImage = CLIENT_LOGOS.filter((e) => Boolean(e.image?.trim())).length;
  const visible = CLIENT_LOGOS.filter((e) => e.isVisible).length;
  return { total: CLIENT_LOGOS.length, withImage, visible };
}
