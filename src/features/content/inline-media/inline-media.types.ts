/**
 * Canonical inline media placement contract (Sprint 14.2).
 *
 * Persistence:
 * - ContentMediaAssignment (placement=INLINE) is the durable relation.
 * - Assignment.metadata.inline holds this block (minus mediaAssetId, which is
 *   the assignment FK).
 * - BlogPost.content gets a resolved <figure data-media-id="…"> at apply time
 *   so the public renderer needs no extra fetch for happy-path assets.
 *
 * No new table. mediaAssetId is canonical; URLs are never the source of truth.
 */

export const INLINE_MEDIA_POSITIONS = [
  "AFTER_HEADING",
  "AFTER_INTRO",
  "BETWEEN_PARAGRAPHS",
  "BEFORE_CTA",
] as const;

export type InlineMediaPosition = (typeof INLINE_MEDIA_POSITIONS)[number];

export const INLINE_MEDIA_VARIANTS = ["CONTENT_WIDTH", "WIDE", "FULL_WIDTH"] as const;
export type InlineMediaVariant = (typeof INLINE_MEDIA_VARIANTS)[number];

export const INLINE_MEDIA_SELECTED_BY = ["SYSTEM", "EDITOR"] as const;
export type InlineMediaSelectedBy = (typeof INLINE_MEDIA_SELECTED_BY)[number];

export type InlineMediaBlock = {
  id: string;
  type: "IMAGE";
  mediaAssetId: string;
  placement: {
    afterSectionId: string;
    position: InlineMediaPosition;
  };
  variant: InlineMediaVariant;
  caption: string | null;
  altText: string;
  sourceCredit: string | null;
  locked: boolean;
  selectedBy: InlineMediaSelectedBy;
  selectionReason: string | null;
  score: number | null;
};

/** Stored under ContentMediaAssignment.metadata.inline */
export type InlineMediaAssignmentMeta = {
  blockId: string;
  afterSectionId: string;
  position: InlineMediaPosition;
  variant: InlineMediaVariant;
  sourceCredit: string | null;
  locked: boolean;
  selectedBy: InlineMediaSelectedBy;
  selectionReason: string | null;
  score: number | null;
  /** Heading text at apply time — used to re-anchor after content edits. */
  sectionHeading: string | null;
};

export type SectionMediaIntent =
  | "HERO_SUPPORT"
  | "PRODUCT_OVERVIEW"
  | "MATERIAL_DETAIL"
  | "FABRIC_CLOSEUP"
  | "COMPARISON"
  | "PRINT_METHOD"
  | "EMBROIDERY"
  | "LOGO_DETAIL"
  | "PROCESS"
  | "FACTORY"
  | "QC"
  | "PACKING"
  | "SIZE_CHART"
  | "FIT"
  | "PRODUCT_DETAIL"
  | "SHOWROOM"
  | "TEAM"
  | "CONTACT"
  | "GENERAL"
  | "EXCLUDE";

export type ArticleSectionRef = {
  id: string;
  heading: string;
  level: 2 | 3;
  /** Plain text length of the section body (between this heading and the next). */
  textLength: number;
  /** Index of the heading open tag in the HTML. */
  headingStart: number;
  /** Index just after the heading close tag — default AFTER_HEADING insert point. */
  afterHeadingIndex: number;
  /** Index just before the next heading / end — used for BEFORE_CTA / end of section. */
  sectionEndIndex: number;
  intent: SectionMediaIntent;
  excluded: boolean;
};

export type InlineMediaCandidate = {
  mediaAssetId: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  altText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  orientation: string;
  seoScore: number;
  seoReadinessStatus: string;
  visibility: string;
  contentSuitabilities: string[];
  subjectTerms: string[];
  useCaseTerms: string[];
  industryTerms: string[];
  libraryCode: string | null;
  roleCode: string | null;
  collectionIds: string[];
  source: "BUNDLE_SLOT" | "TOPIC_BUNDLE" | "ASSIGNMENT" | "DISCOVERY" | "COLLECTION";
  bundleSlotType: string | null;
};

export type InlineMediaScoreBreakdown = {
  total: number;
  signals: Array<{ key: string; points: number; detail: string }>;
};

export type RankedInlineCandidate = {
  candidate: InlineMediaCandidate;
  score: InlineMediaScoreBreakdown;
};

export type ProposedInlinePlacement = {
  block: InlineMediaBlock;
  candidate: InlineMediaCandidate;
  section: ArticleSectionRef;
  score: InlineMediaScoreBreakdown;
};

export type InlineMediaPlanMode = "SUGGEST_ONLY" | "APPLY_UNLOCKED" | "REBUILD_UNLOCKED";

export type InlineMediaPlan = {
  targetCount: number;
  proposedCount: number;
  placements: ProposedInlinePlacement[];
  skippedSections: Array<{ sectionId: string; heading: string; reason: string }>;
  gaps: string[];
  warnings: string[];
  durationMs: number;
  diagnostics: {
    candidateCount: number;
    bundleHitCount: number;
    discoveryHitCount: number;
    scoreRange: { min: number; max: number } | null;
  };
};

export type InlineMediaApplyResult = {
  applied: number;
  skippedLocked: number;
  removedUnlocked: number;
  content: string;
  blocks: InlineMediaBlock[];
  warnings: string[];
};

export const INLINE_META_KEY = "inline" as const;

export function isInlineMediaAssignmentMeta(value: unknown): value is InlineMediaAssignmentMeta {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.blockId === "string" &&
    typeof row.afterSectionId === "string" &&
    typeof row.position === "string" &&
    typeof row.variant === "string" &&
    typeof row.locked === "boolean" &&
    typeof row.selectedBy === "string"
  );
}

export function blockToAssignmentMeta(block: InlineMediaBlock, sectionHeading: string | null): InlineMediaAssignmentMeta {
  return {
    blockId: block.id,
    afterSectionId: block.placement.afterSectionId,
    position: block.placement.position,
    variant: block.variant,
    sourceCredit: block.sourceCredit,
    locked: block.locked,
    selectedBy: block.selectedBy,
    selectionReason: block.selectionReason,
    score: block.score,
    sectionHeading,
  };
}

export function assignmentMetaToBlock(
  mediaAssetId: string,
  meta: InlineMediaAssignmentMeta,
  altText: string,
  caption: string | null,
): InlineMediaBlock {
  return {
    id: meta.blockId,
    type: "IMAGE",
    mediaAssetId,
    placement: {
      afterSectionId: meta.afterSectionId,
      position: meta.position,
    },
    variant: meta.variant,
    caption,
    altText,
    sourceCredit: meta.sourceCredit,
    locked: meta.locked,
    selectedBy: meta.selectedBy,
    selectionReason: meta.selectionReason,
    score: meta.score,
  };
}
