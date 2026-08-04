/**
 * Sprint 16.1 — normalizes a validated ContentGenerationOutput (whatever
 * shape it has for a given type) into a single flat shape the proposal
 * panel/diff/why-reasoning components can render without switching on
 * `type` everywhere. Pure + read-only: never mutates the output.
 */

import type { ContentGenerationType } from "@/features/content-generation/contracts/generation.types";

export type ProposalWhyItem = {
  label: string;
  sourceLabel?: string;
};

export type ProposalDisplay = {
  heading: string | null;
  html: string | null;
  plainText: string | null;
  factIds: string[];
  mediaIds: string[];
  linkIds: string[];
  warnings: string[];
  why: ProposalWhyItem[];
  /** Raw list items for list-shaped outputs (FAQ items, media/link suggestions). */
  items: Array<Record<string, unknown>>;
};

function emptyDisplay(): ProposalDisplay {
  return { heading: null, html: null, plainText: null, factIds: [], mediaIds: [], linkIds: [], warnings: [], why: [], items: [] };
}

function truncateId(id: string, len = 8): string {
  return id.length > len ? `${id.slice(0, len)}…` : id;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value.filter((v) => v && typeof v === "object") as Array<Record<string, unknown>>) : [];
}

const SECTION_TYPES = new Set<ContentGenerationType>([
  "SECTION_DRAFT",
  "SECTION_REWRITE",
  "SECTION_SHORTEN",
  "SECTION_EXPAND",
  "SECTION_TONE_CHANGE",
  "SECTION_EXAMPLE",
]);

export function extractProposalDisplay(type: ContentGenerationType, output: unknown): ProposalDisplay {
  const base = emptyDisplay();
  if (!output || typeof output !== "object") return base;
  const o = output as Record<string, unknown>;
  const warnings = asStringArray(o.warnings);

  if (SECTION_TYPES.has(type)) {
    const factIds = asStringArray(o.factIdsUsed);
    const mediaIds = asStringArray(o.mediaIdsUsed);
    const linkIds = asStringArray(o.internalLinkIdsUsed);
    return {
      ...base,
      heading: typeof o.heading === "string" ? o.heading : null,
      html: typeof o.html === "string" ? o.html : null,
      plainText: typeof o.plainText === "string" ? o.plainText : null,
      factIds,
      mediaIds,
      linkIds,
      warnings,
      why: factIds.map((id) => ({ label: `Dùng Knowledge #${truncateId(id)}`, sourceLabel: `Knowledge #${truncateId(id)}` })),
    };
  }

  if (type === "FAQ_SUGGESTION") {
    const items = asRecordArray(o.items);
    const factIds = Array.from(new Set(items.flatMap((item) => asStringArray(item.factIdsUsed))));
    return {
      ...base,
      factIds,
      warnings,
      why: factIds.map((id) => ({ label: `Dùng Knowledge #${truncateId(id)}` })),
      items,
    };
  }

  if (type === "CTA_SUGGESTION") {
    return {
      ...base,
      plainText: typeof o.ctaText === "string" ? o.ctaText : null,
      warnings,
      items: [o],
    };
  }

  if (type === "META_SUGGESTION") {
    return {
      ...base,
      plainText: [o.metaTitle, o.metaDescription].filter((v) => typeof v === "string").join(" — ") || null,
      warnings,
      items: [o],
    };
  }

  if (type === "MEDIA_SUGGESTION") {
    const suggestions = asRecordArray(o.suggestions);
    const mediaIds = suggestions.map((s) => (typeof s.mediaAssetId === "string" ? s.mediaAssetId : "")).filter(Boolean);
    return {
      ...base,
      mediaIds,
      warnings,
      why: suggestions
        .filter((s) => typeof s.reason === "string" && s.reason)
        .map((s) => ({
          label: String(s.reason),
          sourceLabel: `Media #${truncateId(typeof s.mediaAssetId === "string" ? s.mediaAssetId : "")}`,
        })),
      items: suggestions,
    };
  }

  if (type === "INTERNAL_LINK_SUGGESTION") {
    const suggestions = asRecordArray(o.suggestions);
    return {
      ...base,
      warnings,
      why: suggestions
        .filter((s) => typeof s.reason === "string" && s.reason)
        .map((s) => ({ label: String(s.reason), sourceLabel: typeof s.anchorText === "string" ? s.anchorText : undefined })),
      items: suggestions,
    };
  }

  if (type === "ALT_CAPTION_SUGGESTION") {
    return {
      ...base,
      plainText: typeof o.altText === "string" ? o.altText : null,
      warnings,
      items: [o],
    };
  }

  // BRIEF_SUGGESTION / OUTLINE_SUGGESTION — shown via their own brief UI; keep warnings visible here.
  return { ...base, warnings };
}
