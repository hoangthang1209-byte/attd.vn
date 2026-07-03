import type { TechPackAssetType } from "@prisma/client";
import { resolveAbsoluteMediaUrl } from "@/features/quotes/resolve-absolute-media-url";
import { TECH_PACK_ASSET_TYPE_LABELS } from "@/features/tech-pack/tech-pack-labels";
import type { TechPackPdfAssetDto, TechPackPdfAssetSection } from "@/features/tech-pack/pdf/tech-pack-pdf.types";

const CONSTRUCTION_TYPES = new Set<TechPackAssetType>([
  "FLAT_SKETCH_FRONT",
  "FLAT_SKETCH_BACK",
  "CONSTRUCTION_CALLOUT",
]);

const ARTWORK_TYPES = new Set<TechPackAssetType>([
  "LOGO_PLACEMENT",
  "PRINT_PLACEMENT",
  "EMBROIDERY_PLACEMENT",
  "ARTWORK_REFERENCE",
]);

function assetSection(type: TechPackAssetType): TechPackPdfAssetSection {
  if (CONSTRUCTION_TYPES.has(type)) return "construction";
  if (ARTWORK_TYPES.has(type)) return "artwork";
  if (type === "MEASUREMENT_DIAGRAM") return "measurement";
  if (type === "OTHER") return "bom";
  return "construction";
}

export function mapTechPackAssetForPdf(
  asset: {
    id: string;
    type: TechPackAssetType;
    title: string | null;
    description: string | null;
    previewUrl: string | null;
    originalFileName: string | null;
    fileType: string;
  },
  baseUrl: string,
): TechPackPdfAssetDto {
  const previewUrl = resolveAbsoluteMediaUrl(asset.previewUrl, baseUrl);
  const isImage = asset.fileType === "IMAGE";
  const isPdfPreview = asset.fileType === "PDF" && Boolean(previewUrl);

  return {
    id: asset.id,
    section: assetSection(asset.type),
    type: asset.type,
    typeLabel: TECH_PACK_ASSET_TYPE_LABELS[asset.type],
    title: asset.title,
    previewUrl,
    isPreviewable: Boolean(previewUrl && (isImage || isPdfPreview)),
    isPdfPreview,
    originalFileName: asset.originalFileName,
    note: asset.description,
  };
}

export function sortSizeColumns(sizes: string[]): string[] {
  const known = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  return [...sizes].sort((a, b) => {
    const ai = known.indexOf(a.trim().toUpperCase());
    const bi = known.indexOf(b.trim().toUpperCase());
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" });
  });
}

export function formatViDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("vi-VN");
}

export function formatViDateTime(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("vi-VN");
}
