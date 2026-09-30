import { listMediaAssets } from "@/features/media/services/media.service";
import { getPublicMediaUrl } from "@/features/media/get-public-media-url";

export type PublicSurfaceMedia =
  | "homepage"
  | "catalog"
  | "oem"
  | "dealer"
  | "contact";

type Candidate = {
  libraryCode: string;
  roleCode?: string;
};

const SURFACE_CANDIDATES: Record<PublicSurfaceMedia, Candidate[]> = {
  homepage: [
    { libraryCode: "HOMEPAGE", roleCode: "HERO" },
    { libraryCode: "MARKETING", roleCode: "HERO" },
    { libraryCode: "HOMEPAGE", roleCode: "FEATURED" },
  ],
  catalog: [
    { libraryCode: "PRODUCT", roleCode: "FEATURED" },
    { libraryCode: "PRODUCT", roleCode: "HERO" },
    { libraryCode: "MARKETING", roleCode: "HERO" },
  ],
  oem: [
    { libraryCode: "MANUFACTURING", roleCode: "PROCESS" },
    { libraryCode: "MANUFACTURING", roleCode: "FACTORY" },
    { libraryCode: "MARKETING", roleCode: "HERO" },
  ],
  dealer: [
    { libraryCode: "DEALER", roleCode: "HERO" },
    { libraryCode: "MARKETING", roleCode: "HERO" },
    { libraryCode: "CUSTOMER", roleCode: "FEATURED" },
  ],
  contact: [
    { libraryCode: "BRANDING", roleCode: "HERO" },
    { libraryCode: "MARKETING", roleCode: "HERO" },
    { libraryCode: "HOMEPAGE", roleCode: "FEATURED" },
  ],
};

function resolveAssetUrl(asset: {
  url?: string | null;
  thumbnailUrl?: string | null;
}): string | null {
  return getPublicMediaUrl(asset.url) ?? getPublicMediaUrl(asset.thumbnailUrl);
}

/**
 * Selects one real image from Admin Media for a public surface.
 * Only PUBLIC assets are eligible. No demo/AI fallback is used.
 */
export async function getPublicSurfaceMedia(
  surface: PublicSurfaceMedia,
): Promise<{ url: string; alt: string } | null> {
  for (const candidate of SURFACE_CANDIDATES[surface]) {
    const assets = await listMediaAssets({
      libraryCode: candidate.libraryCode,
      roleCode: candidate.roleCode,
      visibility: "PUBLIC",
      limit: 12,
    });

    const usable = assets.find((asset) => {
      if (!asset.mimeType?.startsWith("image/")) return false;
      return Boolean(resolveAssetUrl(asset));
    });

    if (!usable) continue;

    const url = resolveAssetUrl(usable);
    if (!url) continue;

    return {
      url,
      alt:
        usable.altText?.trim() ||
        usable.title?.trim() ||
        usable.caption?.trim() ||
        "Hình ảnh thực tế ATTD",
    };
  }

  return null;
}
