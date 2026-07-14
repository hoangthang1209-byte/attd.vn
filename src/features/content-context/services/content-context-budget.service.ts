import type {
  ContentContextFact,
  ContentContextInternalLink,
  ContentContextMediaAsset,
  ContentContextPackage,
} from "@/features/content-context/content-context.types";

/** Deterministic approximate token estimate (~4 chars/token). */
export function estimateTokensFromCharacters(characters: number): number {
  return Math.max(0, Math.ceil(characters / 4));
}

export function measurePackageCharacters(pkg: {
  contextText: string;
  facts: ContentContextFact[];
  warnings: string[];
}): number {
  return (
    pkg.contextText.length +
    pkg.facts.reduce((sum, f) => sum + f.statement.length + f.sourceTitle.length, 0) +
    pkg.warnings.join("\n").length
  );
}

export type BudgetTrimResult = {
  facts: ContentContextFact[];
  mediaAssets: ContentContextMediaAsset[];
  internalLinks: ContentContextInternalLink[];
  sectionsTrimmed: string[];
  factsDropped: number;
  mediaDropped: number;
  linksDropped: number;
  actualCharacters: number;
  estimatedInputTokens: number;
};

/**
 * Enforce character budget while preserving required facts, conflicts/warnings,
 * business rules (already outside this trim list), and CTA/outline (in brief).
 */
export function applyContentContextBudget(input: {
  requestedMaxCharacters: number;
  facts: ContentContextFact[];
  mediaAssets: ContentContextMediaAsset[];
  internalLinks: ContentContextInternalLink[];
  fixedTextLength: number;
  maxFacts: number;
  maxMediaAssets: number;
  maxInternalLinks: number;
}): BudgetTrimResult {
  const sectionsTrimmed: string[] = [];
  let facts = [...input.facts].sort((a, b) => b.priorityScore - a.priorityScore);
  let media = [...input.mediaAssets];
  let links = [...input.internalLinks];

  const requiredFacts = facts.filter((f) => f.required);
  let optionalFacts = facts.filter((f) => !f.required);

  let factsDropped = 0;
  let mediaDropped = 0;
  let linksDropped = 0;

  if (facts.length > input.maxFacts) {
    const keepOptional = Math.max(0, input.maxFacts - requiredFacts.length);
    const dropped = optionalFacts.slice(keepOptional);
    optionalFacts = optionalFacts.slice(0, keepOptional);
    factsDropped += dropped.length;
    if (dropped.length) sectionsTrimmed.push("optional_facts_capped");
  }
  facts = [...requiredFacts, ...optionalFacts].sort((a, b) => b.priorityScore - a.priorityScore);

  const selectedMedia = media.filter((m) => m.selected || m.required);
  let optionalMedia = media.filter((m) => !m.selected && !m.required);
  if (selectedMedia.length + optionalMedia.length > input.maxMediaAssets) {
    const keep = Math.max(0, input.maxMediaAssets - selectedMedia.length);
    mediaDropped += Math.max(0, optionalMedia.length - keep);
    optionalMedia = optionalMedia.slice(0, keep);
    if (mediaDropped) sectionsTrimmed.push("optional_media_capped");
  }
  media = [...selectedMedia, ...optionalMedia];

  const requiredLinks = links.filter((l) => l.required || l.recommendation === "REQUIRED");
  let optionalLinks = links.filter((l) => !l.required && l.recommendation !== "REQUIRED");
  if (links.length > input.maxInternalLinks) {
    const keep = Math.max(0, input.maxInternalLinks - requiredLinks.length);
    linksDropped += Math.max(0, optionalLinks.length - keep);
    optionalLinks = optionalLinks.slice(0, keep);
    if (linksDropped) sectionsTrimmed.push("optional_links_capped");
  }
  links = [...requiredLinks, ...optionalLinks];

  const estimate = () =>
    input.fixedTextLength +
    facts.reduce((s, f) => s + f.statement.length + 80, 0) +
    media.reduce((s, m) => s + (m.title?.length ?? 0) + (m.altText?.length ?? 0) + 40, 0) +
    links.reduce((s, l) => s + l.anchorText.length + l.url.length + 40, 0);

  while (estimate() > input.requestedMaxCharacters && optionalFacts.length > 0) {
    const dropped = optionalFacts.pop();
    if (!dropped) break;
    factsDropped += 1;
    facts = facts.filter((f) => f.factId !== dropped.factId);
    if (!sectionsTrimmed.includes("optional_facts_budget")) {
      sectionsTrimmed.push("optional_facts_budget");
    }
  }

  while (
    estimate() > input.requestedMaxCharacters &&
    optionalLinks.some((l) => l.recommendation === "OPTIONAL")
  ) {
    const idx = optionalLinks.findIndex((l) => l.recommendation === "OPTIONAL");
    if (idx < 0) break;
    const [dropped] = optionalLinks.splice(idx, 1);
    linksDropped += 1;
    links = links.filter((l) => l.sourceOpportunityId !== dropped.sourceOpportunityId || l.url !== dropped.url);
    if (!sectionsTrimmed.includes("optional_links_budget")) {
      sectionsTrimmed.push("optional_links_budget");
    }
  }

  while (
    estimate() > input.requestedMaxCharacters &&
    optionalMedia.length > 0
  ) {
    optionalMedia.pop();
    mediaDropped += 1;
    media = [...selectedMedia, ...optionalMedia];
    if (!sectionsTrimmed.includes("optional_media_budget")) {
      sectionsTrimmed.push("optional_media_budget");
    }
  }

  // Shorten verbose optional statements only as last resort
  facts = facts.map((f) => {
    if (f.required || estimate() <= input.requestedMaxCharacters) return f;
    if (f.statement.length > 400) {
      if (!sectionsTrimmed.includes("verbose_summaries_shortened")) {
        sectionsTrimmed.push("verbose_summaries_shortened");
      }
      return { ...f, statement: `${f.statement.slice(0, 397)}...` };
    }
    return f;
  });

  const actualCharacters = estimate();
  return {
    facts,
    mediaAssets: media,
    internalLinks: links,
    sectionsTrimmed,
    factsDropped,
    mediaDropped,
    linksDropped,
    actualCharacters,
    estimatedInputTokens: estimateTokensFromCharacters(actualCharacters),
  };
}

export function summarizeBudgetForPackage(
  pkg: Pick<ContentContextPackage, "budget" | "diagnostics">,
): Record<string, unknown> {
  return {
    ...pkg.budget,
    diagnostics: pkg.diagnostics,
  };
}
