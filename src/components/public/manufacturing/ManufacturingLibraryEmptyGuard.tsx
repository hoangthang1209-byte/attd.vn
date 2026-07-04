import type { ReactNode } from "react";
import type { ManufacturingEvidenceItem } from "@/lib/manufacturing-library.types";
import { isValidImageSrc } from "@/lib/imagePaths";

type Props = {
  items: readonly ManufacturingEvidenceItem[];
  children: (itemsWithMedia: readonly ManufacturingEvidenceItem[]) => ReactNode;
};

const VALID_VIDEO_URL_PATTERN = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

export function hasManufacturingEvidenceMedia(item: ManufacturingEvidenceItem): boolean {
  if (item.imageUrl && isValidImageSrc(item.imageUrl)) return true;
  if (!item.videoUrl?.trim()) return false;

  const videoUrl = item.videoUrl.trim();
  if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
    try {
      new URL(videoUrl);
      return true;
    } catch {
      return false;
    }
  }

  if (videoUrl.startsWith("/") && videoUrl.length > 1) return true;
  return VALID_VIDEO_URL_PATTERN.test(videoUrl);
}

export function getManufacturingEvidenceWithMedia(
  items: readonly ManufacturingEvidenceItem[],
): readonly ManufacturingEvidenceItem[] {
  return items.filter(hasManufacturingEvidenceMedia);
}

export default function ManufacturingLibraryEmptyGuard({ items, children }: Props) {
  const itemsWithMedia = getManufacturingEvidenceWithMedia(items);
  if (itemsWithMedia.length === 0) return null;
  return <>{children(itemsWithMedia)}</>;
}
