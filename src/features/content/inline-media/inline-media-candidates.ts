import type { MediaBundleSlotType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPublicMediaUrl } from "@/features/media/get-public-media-url";
import type { InlineMediaCandidate, SectionMediaIntent } from "@/features/content/inline-media/inline-media.types";
import { intentsForBundleSlot } from "@/features/content/inline-media/section-media-intent";

const ASSET_SELECT = {
  id: true,
  url: true,
  thumbnailUrl: true,
  title: true,
  altText: true,
  caption: true,
  width: true,
  height: true,
  orientation: true,
  seoScore: true,
  seoReadinessStatus: true,
  visibility: true,
  mimeType: true,
  contentSuitabilities: true,
  subjectTerms: true,
  useCaseTerms: true,
  industryTerms: true,
  duplicateOfId: true,
  duplicateStatus: true,
  library: { select: { code: true } },
  role: { select: { code: true } },
  collections: { select: { mediaCollectionId: true } },
} satisfies Prisma.MediaAssetSelect;

type AssetRow = Prisma.MediaAssetGetPayload<{ select: typeof ASSET_SELECT }>;

const MIN_DIMENSION = 400;
const DISCOVERY_LIMIT = 40;

const SUITABILITY_ALLOWLIST = [
  "FEATURED_IMAGE",
  "BLOG_INLINE",
  "BLOG_COVER",
  "PRODUCT_GALLERY",
  "PRODUCT_DETAIL",
  "MATERIAL_DETAIL",
  "TECHNIQUE_DETAIL",
  "PROCESS_STEP",
  "FACTORY_STORY",
  "SPECIFICATION",
  "TEAM_PROFILE",
  "CASE_STUDY",
  "DOCUMENTATION",
] as const;

export type FindInlineMediaCandidatesInput = {
  topicId?: string | null;
  sectionId: string;
  sectionHeading: string;
  sectionText?: string;
  intent: SectionMediaIntent;
  preferredSlots: MediaBundleSlotType[];
  preferredSuitabilities: string[];
  mediaBundleId?: string | null;
  excludedMediaIds?: string[];
  /** Topic / brief keywords that broaden discovery beyond the heading. */
  topicKeywords?: string[];
  limit?: number;
};

export type FindInlineMediaCandidatesResult = {
  candidates: InlineMediaCandidate[];
  bundleHits: number;
  discoveryHits: number;
  /** Bundle assets skipped because URL is not publicly resolvable (e.g. Vercel Blob). */
  brokenBundleUrlCount: number;
};

function discoveryLibraryRoles(intent: SectionMediaIntent): {
  libraryCodes: string[];
  roleCodes: string[];
} {
  switch (intent) {
    case "PRINT_METHOD":
    case "EMBROIDERY":
    case "LOGO_DETAIL":
      return {
        libraryCodes: ["MANUFACTURING"],
        roleCodes: ["PRINTING", "EMBROIDERY", "PROCESS", "DETAIL"],
      };
    case "PROCESS":
    case "QC":
    case "PACKING":
      return {
        libraryCodes: ["MANUFACTURING"],
        roleCodes: ["PROCESS", "PRINTING", "FACTORY"],
      };
    case "FACTORY":
    case "CONTACT":
    case "SHOWROOM":
      return { libraryCodes: ["MANUFACTURING", "CASE_STUDY"], roleCodes: ["FACTORY", "GALLERY"] };
    case "MATERIAL_DETAIL":
    case "FABRIC_CLOSEUP":
    case "COMPARISON":
      return {
        libraryCodes: ["PRODUCT", "MATERIAL"],
        roleCodes: ["MATERIAL", "DETAIL", "PRODUCT_MAIN", "GALLERY"],
      };
    case "SIZE_CHART":
    case "FIT":
    case "PRODUCT_DETAIL":
    case "PRODUCT_OVERVIEW":
    case "HERO_SUPPORT":
      return {
        libraryCodes: ["PRODUCT"],
        roleCodes: ["PRODUCT_MAIN", "GALLERY", "PRODUCT", "DETAIL"],
      };
    case "TEAM":
      return { libraryCodes: ["TEAM", "CASE_STUDY"], roleCodes: ["TEAM", "GALLERY"] };
    default:
      return {
        libraryCodes: ["PRODUCT", "MANUFACTURING"],
        roleCodes: ["PRODUCT_MAIN", "GALLERY", "FACTORY", "PRINTING", "PROCESS"],
      };
  }
}

function isSubjectMismatch(asset: AssetRow, topicKeywords: string[]): boolean {
  const haystack = topicKeywords.join(" ").toLowerCase();
  if (!haystack.includes("polo")) return false;
  return asset.subjectTerms.some((term) => term.toLowerCase().includes("hoodie"));
}

function keywordTokens(...sources: Array<string | null | undefined>): string[] {
  const tokens = new Set<string>();
  for (const source of sources) {
    if (!source?.trim()) continue;
    for (const raw of source.split(/[\s,/|;]+/)) {
      const token = raw.trim();
      if (token.length >= 3) tokens.add(token);
    }
  }
  return [...tokens].slice(0, 12);
}

function toCandidate(
  asset: AssetRow,
  source: InlineMediaCandidate["source"],
  bundleSlotType: string | null,
): InlineMediaCandidate | null {
  if (asset.visibility !== "PUBLIC") return null;
  if (!asset.mimeType.toLowerCase().startsWith("image/")) return null;
  if (asset.duplicateOfId) return null;
  if (asset.duplicateStatus === "CONFIRMED_DUPLICATE") return null;

  const publicUrl = getPublicMediaUrl(asset.url);
  if (!publicUrl) return null;

  // Unknown dimensions are allowed for curated bundle assets; discovery still
  // prefers known sizes via scoring / hard min when dimensions exist.
  const minDim = Math.min(asset.width ?? 0, asset.height ?? 0);
  if (minDim > 0 && minDim < MIN_DIMENSION && source === "DISCOVERY") return null;

  return {
    mediaAssetId: asset.id,
    url: publicUrl,
    thumbnailUrl: asset.thumbnailUrl ? getPublicMediaUrl(asset.thumbnailUrl) : null,
    title: asset.title,
    altText: asset.altText,
    caption: asset.caption,
    width: asset.width,
    height: asset.height,
    orientation: asset.orientation,
    seoScore: asset.seoScore,
    seoReadinessStatus: asset.seoReadinessStatus,
    visibility: asset.visibility,
    contentSuitabilities: asset.contentSuitabilities,
    subjectTerms: asset.subjectTerms,
    useCaseTerms: asset.useCaseTerms,
    industryTerms: asset.industryTerms,
    libraryCode: asset.library?.code ?? null,
    roleCode: asset.role?.code ?? null,
    collectionIds: asset.collections.map((row) => row.mediaCollectionId),
    source,
    bundleSlotType,
  };
}

function mergeCandidates(
  into: Map<string, InlineMediaCandidate>,
  candidate: InlineMediaCandidate | null,
): void {
  if (!candidate) return;
  const existing = into.get(candidate.mediaAssetId);
  if (!existing) {
    into.set(candidate.mediaAssetId, candidate);
    return;
  }
  const rank: Record<InlineMediaCandidate["source"], number> = {
    BUNDLE_SLOT: 5,
    TOPIC_BUNDLE: 4,
    ASSIGNMENT: 3,
    COLLECTION: 2,
    DISCOVERY: 1,
  };
  if (rank[candidate.source] > rank[existing.source]) {
    into.set(candidate.mediaAssetId, candidate);
  }
}

/**
 * Bounded candidate retrieval. Priority:
 * 1. Explicit Media Bundle slot assets
 * 2. Topic-linked Bundle assets
 * 3. Existing ContentMediaAssignment
 * 4. Media Library discovery (suitability / keywords / role)
 * 5. Collection matches (via discovery collections already loaded)
 */
export async function findInlineMediaCandidates(
  input: FindInlineMediaCandidatesInput,
): Promise<FindInlineMediaCandidatesResult> {
  const excluded = new Set(input.excludedMediaIds ?? []);
  const limit = Math.min(Math.max(input.limit ?? 24, 1), 48);
  const byId = new Map<string, InlineMediaCandidate>();
  let bundleHits = 0;
  let discoveryHits = 0;
  let brokenBundleUrlCount = 0;

  let bundleId = input.mediaBundleId ?? null;
  if (!bundleId && input.topicId) {
    const topic = await prisma.seoTopic.findUnique({
      where: { id: input.topicId },
      select: { mediaBundleId: true },
    });
    bundleId = topic?.mediaBundleId ?? null;
  }

  if (bundleId) {
    const slots = await prisma.mediaBundleSlot.findMany({
      where: { mediaBundleId: bundleId },
      include: {
        assets: {
          include: { mediaAsset: { select: ASSET_SELECT } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    for (const slot of slots) {
      const intentMatch = intentsForBundleSlot(slot.slotType).includes(input.intent);
      const preferred = input.preferredSlots.includes(slot.slotType);
      const isInlineFamily = [
        "INLINE",
        "PRODUCT",
        "MATERIAL",
        "TECHNIQUE",
        "PROCESS",
        "FACTORY",
        "GALLERY",
        "FEATURED",
        "HERO",
      ].includes(slot.slotType);
      // Do not let PROCESS/FACTORY spill into MATERIAL/PRINT sections just because
      // they share the bundle — that steals the best assets from matching sections.
      const softFamily =
        isInlineFamily &&
        ["GENERAL", "PRODUCT_OVERVIEW", "HERO_SUPPORT", "FIT", "SIZE_CHART"].includes(input.intent);
      if (!preferred && !intentMatch && !softFamily) continue;

      for (const row of slot.assets) {
        if (excluded.has(row.mediaAssetId)) continue;
        const source = preferred || intentMatch ? "BUNDLE_SLOT" : "TOPIC_BUNDLE";
        const candidate = toCandidate(row.mediaAsset, source, slot.slotType);
        if (candidate) {
          mergeCandidates(byId, candidate);
          if (source === "BUNDLE_SLOT") bundleHits += 1;
        } else if (
          row.mediaAsset.visibility === "PUBLIC" &&
          !getPublicMediaUrl(row.mediaAsset.url)
        ) {
          brokenBundleUrlCount += 1;
        }
      }
    }
  }

  // Bounded discovery from the public DAM. Keep this resilient — a discovery
  // query failure must not wipe curated Bundle candidates.
  try {
    const tokens = keywordTokens(
      input.sectionHeading,
      ...(input.topicKeywords ?? []),
      input.sectionText?.slice(0, 200),
    );
    const { libraryCodes, roleCodes } = discoveryLibraryRoles(input.intent);

    const suitabilityFilter = input.preferredSuitabilities.filter((value) =>
      (SUITABILITY_ALLOWLIST as readonly string[]).includes(value),
    );

    const orFilters: Prisma.MediaAssetWhereInput[] = [
      { contentSuitabilities: { has: "BLOG_INLINE" } },
    ];

    if (suitabilityFilter.length) {
      orFilters.push({ contentSuitabilities: { hasSome: suitabilityFilter as never[] } });
    }

    if (tokens.length) {
      orFilters.push({
        OR: tokens.flatMap((token) => [
          { title: { contains: token, mode: "insensitive" as const } },
          { altText: { contains: token, mode: "insensitive" as const } },
          { keywords: { has: token } },
          { subjectTerms: { has: token } },
        ]),
      });
    }

    if (libraryCodes.length || roleCodes.length) {
      orFilters.push({
        AND: [
          libraryCodes.length ? { library: { code: { in: libraryCodes } } } : {},
          roleCodes.length ? { role: { code: { in: roleCodes } } } : {},
        ],
      });
    }

    const discovered = await prisma.mediaAsset.findMany({
      where: {
        visibility: "PUBLIC",
        mimeType: { startsWith: "image/" },
        duplicateOfId: null,
        lifecycleStatus: { in: ["ACTIVE", "REVIEW_REQUIRED"] },
        id: excluded.size ? { notIn: [...excluded] } : undefined,
        OR: orFilters,
      },
      select: ASSET_SELECT,
      take: DISCOVERY_LIMIT,
      orderBy: [{ seoScore: "desc" }, { updatedAt: "desc" }],
    });

    for (const asset of discovered) {
      if (excluded.has(asset.id)) continue;
      if (isSubjectMismatch(asset, input.topicKeywords ?? [])) continue;
      const candidate = toCandidate(asset, "DISCOVERY", null);
      if (candidate) {
        mergeCandidates(byId, candidate);
        discoveryHits += 1;
      }
    }
  } catch {
    // Discovery is best-effort.
  }

  const candidates = [...byId.values()].slice(0, limit);
  return { candidates, bundleHits, discoveryHits, brokenBundleUrlCount };
}
