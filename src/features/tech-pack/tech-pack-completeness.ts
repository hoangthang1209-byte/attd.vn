import type { TechPackAssetType, TechPackStatus } from "@prisma/client";

export type TechPackCompletenessFlags = {
  hasTechnicalImage: boolean;
  hasArtwork: boolean;
  hasPattern: boolean;
  hasBomReference: boolean;
};

const FLAT_SKETCH_TYPES = new Set<TechPackAssetType>([
  "FLAT_SKETCH_FRONT",
  "FLAT_SKETCH_BACK",
  "CONSTRUCTION_CALLOUT",
  "MEASUREMENT_DIAGRAM",
]);

const ARTWORK_TYPES = new Set<TechPackAssetType>([
  "LOGO_PLACEMENT",
  "PRINT_PLACEMENT",
  "EMBROIDERY_PLACEMENT",
  "ARTWORK_REFERENCE",
]);

export function computeTechPackCompleteness(input: {
  assets: Array<{ type: TechPackAssetType }>;
  artworkPlacementCount: number;
  bomItemCount: number;
  patternId: string | null;
  patternCodeSnapshot: string | null;
  patternExceptionReason: string | null;
}): TechPackCompletenessFlags {
  const hasTechnicalImage = input.assets.some((a) => FLAT_SKETCH_TYPES.has(a.type));
  const hasArtwork =
    input.artworkPlacementCount > 0 || input.assets.some((a) => ARTWORK_TYPES.has(a.type));
  const hasPattern = Boolean(
    input.patternId || input.patternCodeSnapshot?.trim() || input.patternExceptionReason?.trim(),
  );
  const hasBomReference = input.bomItemCount > 0;

  return { hasTechnicalImage, hasArtwork, hasPattern, hasBomReference };
}

export type TechPackListQuickFilter =
  | "all"
  | "draft"
  | "released"
  | "missing_pattern"
  | "missing_artwork"
  | "mine";

export function techPackStatusForQuickFilter(
  filter: TechPackListQuickFilter,
): TechPackStatus | undefined {
  if (filter === "draft") return "DRAFT";
  if (filter === "released") return "RELEASED";
  return undefined;
}
