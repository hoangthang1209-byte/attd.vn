import type {
  InlineMediaCandidate,
  InlineMediaScoreBreakdown,
  SectionMediaIntent,
} from "@/features/content/inline-media/inline-media.types";
import { intentsForBundleSlot } from "@/features/content/inline-media/section-media-intent";

export type ScoreInlineCandidateInput = {
  candidate: InlineMediaCandidate;
  intent: SectionMediaIntent;
  preferredSlots: string[];
  preferredSuitabilities: string[];
  sectionHeading: string;
  sectionKeywords?: string[];
  usedMediaIds: Set<string>;
  usedCollectionIds: Map<string, number>;
  coverMediaIds?: Set<string>;
  rejectedMediaIds?: Set<string>;
  /** Roles already used in nearby accepted placements. */
  adjacentRoleCodes?: Set<string>;
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

function overlapScore(haystack: string[], needles: string[]): number {
  if (!needles.length || !haystack.length) return 0;
  const set = new Set(haystack.map(fold));
  let hits = 0;
  for (const needle of needles) {
    const folded = fold(needle);
    if (!folded) continue;
    if ([...set].some((item) => item.includes(folded) || folded.includes(item))) hits += 1;
  }
  return hits;
}

function roleMatchesIntent(roleCode: string, intent: SectionMediaIntent): boolean {
  const role = roleCode.toUpperCase();
  const map: Record<string, SectionMediaIntent[]> = {
    PRINTING: ["PRINT_METHOD", "EMBROIDERY", "LOGO_DETAIL", "PROCESS"],
    EMBROIDERY: ["EMBROIDERY", "PRINT_METHOD", "LOGO_DETAIL"],
    FACTORY: ["FACTORY", "PROCESS", "CONTACT", "SHOWROOM"],
    PROCESS: ["PROCESS", "QC", "PACKING"],
    PRODUCT_MAIN: ["PRODUCT_OVERVIEW", "HERO_SUPPORT", "FIT", "SIZE_CHART", "PRODUCT_DETAIL"],
    PRODUCT: ["PRODUCT_OVERVIEW", "HERO_SUPPORT", "FIT", "PRODUCT_DETAIL"],
    GALLERY: ["PRODUCT_OVERVIEW", "HERO_SUPPORT", "GENERAL", "SHOWROOM"],
    MATERIAL: ["MATERIAL_DETAIL", "FABRIC_CLOSEUP", "COMPARISON"],
    DETAIL: ["LOGO_DETAIL", "FIT", "PRODUCT_DETAIL", "MATERIAL_DETAIL"],
    TEAM: ["TEAM", "CONTACT", "SHOWROOM"],
  };
  return (map[role] ?? []).includes(intent);
}

function libraryMatchesIntent(libraryCode: string, intent: SectionMediaIntent): boolean {
  const lib = libraryCode.toUpperCase();
  if (lib === "MANUFACTURING") {
    return ["PROCESS", "FACTORY", "QC", "PACKING", "PRINT_METHOD", "EMBROIDERY", "CONTACT"].includes(
      intent,
    );
  }
  if (lib === "PRODUCT" || lib === "MATERIAL") {
    return [
      "PRODUCT_OVERVIEW",
      "HERO_SUPPORT",
      "FIT",
      "SIZE_CHART",
      "PRODUCT_DETAIL",
      "MATERIAL_DETAIL",
      "FABRIC_CLOSEUP",
      "COMPARISON",
    ].includes(intent);
  }
  if (lib === "CASE_STUDY") return ["SHOWROOM", "CONTACT", "GENERAL"].includes(intent);
  if (lib === "TEAM") return ["TEAM", "CONTACT", "SHOWROOM"].includes(intent);
  return false;
}

/**
 * Deterministic inline media scorer. Returns a breakdown for diagnostics.
 * No AI. Stable ordering for equal totals is left to the ranker (id tie-break).
 */
export function scoreInlineMediaCandidate(input: ScoreInlineCandidateInput): InlineMediaScoreBreakdown {
  const { candidate } = input;
  const signals: InlineMediaScoreBreakdown["signals"] = [];

  const add = (key: string, points: number, detail: string) => {
    if (points === 0) return;
    signals.push({ key, points, detail });
  };

  // Bundle / source priority
  if (candidate.source === "BUNDLE_SLOT") {
    add("bundle_slot", 40, `Bundle slot ${candidate.bundleSlotType ?? "INLINE"}`);
  } else if (candidate.source === "TOPIC_BUNDLE") {
    add("topic_bundle", 28, "Topic-linked bundle asset");
  } else if (candidate.source === "ASSIGNMENT") {
    add("assignment", 18, "Existing content assignment");
  } else if (candidate.source === "COLLECTION") {
    add("collection", 12, "Collection match");
  } else {
    add("discovery", 8, "DAM discovery");
  }

  if (
    candidate.bundleSlotType &&
    input.preferredSlots.includes(candidate.bundleSlotType)
  ) {
    add("slot_intent", 18, `Slot ${candidate.bundleSlotType} matches intent`);
  } else if (
    candidate.bundleSlotType &&
    intentsForBundleSlot(candidate.bundleSlotType as never).includes(input.intent)
  ) {
    add("slot_intent_soft", 10, `Slot ${candidate.bundleSlotType} soft-matches intent`);
  }

  const suitabilityHits = candidate.contentSuitabilities.filter((item) =>
    input.preferredSuitabilities.includes(item),
  );
  if (suitabilityHits.length) {
    add("suitability", 16 + Math.min(8, suitabilityHits.length * 2), suitabilityHits.join(", "));
  } else if (candidate.contentSuitabilities.includes("BLOG_INLINE")) {
    add("suitability_blog", 8, "BLOG_INLINE");
  }

  const roleIntentMatched = Boolean(
    candidate.roleCode && roleMatchesIntent(candidate.roleCode, input.intent),
  );
  if (roleIntentMatched) {
    add("role_intent", 16, `${candidate.roleCode} ↔ ${input.intent}`);
  } else if (candidate.roleCode && /PRODUCT|MATERIAL|PROCESS|FACTORY|DETAIL|INLINE|PRINTING|GALLERY/i.test(candidate.roleCode)) {
    add("role", 8, candidate.roleCode);
  } else if (candidate.roleCode && /GENERAL/i.test(candidate.roleCode)) {
    add("role_general", -6, "Generic GENERAL role");
  }

  // Adjacent same-role diversity (metadata only — no vision).
  if (candidate.roleCode && input.adjacentRoleCodes?.has(candidate.roleCode)) {
    add("adjacent_role", -10, `adjacent ${candidate.roleCode}`);
  }

  if (candidate.libraryCode && libraryMatchesIntent(candidate.libraryCode, input.intent)) {
    add("library_intent", 8, candidate.libraryCode);
  } else if (candidate.libraryCode) {
    add("library", 4, candidate.libraryCode);
  }

  const keywordNeedles = [
    input.sectionHeading,
    ...(input.sectionKeywords ?? []),
  ];
  const textFields = [
    candidate.title,
    candidate.altText,
    candidate.caption,
    ...candidate.subjectTerms,
    ...candidate.useCaseTerms,
    ...candidate.industryTerms,
  ].filter(Boolean) as string[];

  const textHits = overlapScore(textFields, keywordNeedles);
  if (textHits > 0) {
    add("keyword_overlap", Math.min(20, textHits * 5), `${textHits} keyword hits`);
  }

  const subjectHits = overlapScore(candidate.subjectTerms, keywordNeedles);
  if (subjectHits > 0) add("subject", Math.min(12, subjectHits * 4), "subject term overlap");

  const useCaseHits = overlapScore(candidate.useCaseTerms, keywordNeedles);
  if (useCaseHits > 0) add("use_case", Math.min(10, useCaseHits * 3), "use-case overlap");

  const industryHits = overlapScore(candidate.industryTerms, keywordNeedles);
  if (industryHits > 0) add("industry", Math.min(8, industryHits * 3), "industry overlap");

  if (candidate.orientation === "LANDSCAPE" || candidate.orientation === "SQUARE") {
    add("orientation", 6, candidate.orientation);
  } else if (candidate.orientation === "PORTRAIT") {
    add("orientation", 2, "PORTRAIT");
  } else {
    add("orientation", -2, "UNKNOWN orientation");
  }

  if (candidate.seoReadinessStatus === "EXCELLENT") add("seo", 10, "EXCELLENT");
  else if (candidate.seoReadinessStatus === "READY") add("seo", 7, "READY");
  else if (candidate.seoReadinessStatus === "BASIC") add("seo", 2, "BASIC");
  else if (candidate.source === "BUNDLE_SLOT" || candidate.source === "TOPIC_BUNDLE" || roleIntentMatched) {
    add("seo", -3, "INCOMPLETE SEO (curated/role match)");
  } else {
    add("seo", -8, "INCOMPLETE SEO");
  }

  if (candidate.seoScore >= 80) add("seo_score", 6, String(candidate.seoScore));
  else if (candidate.seoScore >= 65) add("seo_score", 3, String(candidate.seoScore));
  else if (candidate.seoScore < 40) {
    add(
      "seo_score",
      candidate.source === "BUNDLE_SLOT" || candidate.source === "TOPIC_BUNDLE" || roleIntentMatched
        ? -2
        : -6,
      String(candidate.seoScore),
    );
  }

  if (candidate.visibility === "PUBLIC") add("visibility", 10, "PUBLIC");
  else add("visibility", -100, candidate.visibility);

  const minDim = Math.min(candidate.width ?? 0, candidate.height ?? 0);
  if (minDim >= 1200) add("dimensions", 8, `${candidate.width}x${candidate.height}`);
  else if (minDim >= 800) add("dimensions", 5, `${candidate.width}x${candidate.height}`);
  else if (minDim >= 400) add("dimensions", 1, `${candidate.width}x${candidate.height}`);
  else if (minDim === 0) {
    add(
      "dimensions",
      candidate.source === "BUNDLE_SLOT" || candidate.source === "TOPIC_BUNDLE" ? -2 : -4,
      "unknown dimensions",
    );
  } else {
    add("dimensions", -12, "below minimum dimensions");
  }

  // Missing alt is repaired at apply time with a section-derived fallback, so
  // curated / role-matched assets remain usable.
  if (!candidate.altText?.trim()) {
    add(
      "missing_alt",
      candidate.source === "BUNDLE_SLOT" ||
        candidate.source === "TOPIC_BUNDLE" ||
        roleIntentMatched
        ? -4
        : -12,
      "missing alt",
    );
  }
  if (!candidate.title?.trim()) add("missing_title", -2, "empty title");

  // Subject mismatch: e.g. Hoodie assets against a polo article.
  // Heavy penalty so weak cross-category discovery stays below the apply threshold.
  const haystack = fold(keywordNeedles.join(" "));
  const subjects = candidate.subjectTerms.map(fold);
  if (haystack.includes("polo") && subjects.some((term) => term.includes("hoodie"))) {
    add("subject_mismatch", -50, "Hoodie subject vs polo topic");
  }

  if (input.usedMediaIds.has(candidate.mediaAssetId)) {
    add("already_used", -50, "already used in article");
  }

  if (input.coverMediaIds?.has(candidate.mediaAssetId)) {
    add("cover_reuse", -20, "cover/featured asset");
  }

  if (input.rejectedMediaIds?.has(candidate.mediaAssetId)) {
    add("prior_rejection", -30, "previously rejected for this section");
  }

  for (const collectionId of candidate.collectionIds) {
    const count = input.usedCollectionIds.get(collectionId) ?? 0;
    if (count >= 2) add("collection_overuse", -10, `collection ${collectionId} overused`);
    else if (count === 1) add("collection_repeat", -4, `collection ${collectionId} already used`);
  }

  const total = signals.reduce((sum, signal) => sum + signal.points, 0);
  return { total, signals };
}
