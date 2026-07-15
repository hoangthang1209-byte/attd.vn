/**
 * Pre-assembly graph context budget (Sprint 12.4).
 * Graph additions are trimmed by value-density before merge/render.
 * Baseline facts are never removed by graph growth pressure.
 */

import type {
  AiRetrievedFact,
  AiRetrievalConsumer,
} from "@/features/ai-retrieval/ai-retrieval-types";
import {
  GRAPH_CONTEXT_GROWTH,
  getAddedFactBudget,
} from "@/features/knowledge-graph/evaluation/graph-expansion-budgets";
import {
  resolveGraphQueryIntent,
  type GraphQueryIntent,
} from "@/features/knowledge-graph/evaluation/graph-expansion-path-policy";
import { estimateContextGrowthPercent } from "@/features/ai-retrieval/sources/knowledge-graph-source";

export type GraphContextBudget = {
  baselineCharacters: number;
  maximumTotalCharacters: number;
  maximumGraphCharacters: number;
  targetGrowthPercent: number;
  hardGrowthPercent: number;
};

export type GraphBudgetRejectionReason =
  | "duplicate_supporting"
  | "verbose_kb"
  | "optional_blog"
  | "generic_capability"
  | "second_media_bundle"
  | "low_density_two_hop"
  | "optional_industry_audience"
  | "optional_product"
  | "low_value_density"
  | "over_allowance"
  | "intent_cap"
  | "graph_budget_no_value_fit";

export type GraphContextBudgetDiagnostics = {
  baselineCharacters: number;
  graphAllowance: number;
  proposedGraphCharacters: number;
  acceptedGraphCharacters: number;
  finalCharacters: number | null;
  proposedGrowthPercent: number;
  acceptedGrowthPercent: number;
  actualGrowthPercent: number | null;
  hardCapFallbackUsed: boolean;
  secondPassTrimUsed: boolean;
  fallbackToBaseline: boolean;
  pathsTrimmed: string[];
  scopesTrimmed: string[];
  factsTrimmed: Array<{ factId: string; reason: GraphBudgetRejectionReason }>;
  blogCandidatesTrimmed: number;
  mediaItemsTrimmed: number;
  valueRetainedPerCharacter: number | null;
  mandatoryBaselinePreserved: boolean;
  baselineChecksum: string;
};

export type IntentGraphFactCaps = {
  maxCapability: number;
  maxKnowledge: number;
  maxBlog: number;
  maxProduct: number;
  maxMediaBundle: number;
  maxIndustryAudience: number;
  excludeCategory: boolean;
  suppressGenericFeaturedIn: boolean;
  suppressGenericProductDescriptions: boolean;
};

/** Query-intent refinements — never hardcodes benchmark IDs. */
export function getIntentGraphFactCaps(intent: GraphQueryIntent): IntentGraphFactCaps {
  switch (intent) {
    case "PRODUCT_COMMERCIAL":
      return {
        maxCapability: 2,
        maxKnowledge: 2,
        maxBlog: 2,
        maxProduct: 4,
        maxMediaBundle: 2,
        maxIndustryAudience: 4,
        excludeCategory: true,
        suppressGenericFeaturedIn: true,
        suppressGenericProductDescriptions: false,
      };
    case "MANUFACTURING_CAPABILITY":
      return {
        maxCapability: 5,
        maxKnowledge: 3,
        maxBlog: 1,
        maxProduct: 2,
        maxMediaBundle: 2,
        maxIndustryAudience: 2,
        excludeCategory: true,
        suppressGenericFeaturedIn: true,
        suppressGenericProductDescriptions: true,
      };
    case "OEM_PRIVATE_LABEL":
      return {
        maxCapability: 4,
        maxKnowledge: 4,
        maxBlog: 1,
        maxProduct: 1,
        maxMediaBundle: 1,
        maxIndustryAudience: 2,
        excludeCategory: true,
        suppressGenericFeaturedIn: true,
        suppressGenericProductDescriptions: true,
      };
    case "TECHNIQUE":
      return {
        maxCapability: 4,
        maxKnowledge: 2,
        maxBlog: 1,
        maxProduct: 2,
        maxMediaBundle: 2,
        maxIndustryAudience: 1,
        excludeCategory: true,
        suppressGenericFeaturedIn: true,
        suppressGenericProductDescriptions: true,
      };
    default:
      return {
        maxCapability: 3,
        maxKnowledge: 3,
        maxBlog: 2,
        maxProduct: 3,
        maxMediaBundle: 2,
        maxIndustryAudience: 3,
        excludeCategory: true,
        suppressGenericFeaturedIn: false,
        suppressGenericProductDescriptions: false,
      };
  }
}

export function resolveGraphContextBudget(input: {
  baselineCharacters: number;
  maxContextCharacters: number;
  targetGrowthPercent?: number;
  hardGrowthPercent?: number;
}): GraphContextBudget {
  const targetGrowthPercent =
    input.targetGrowthPercent ?? GRAPH_CONTEXT_GROWTH.targetPercent / 100;
  const hardGrowthPercent =
    input.hardGrowthPercent ?? GRAPH_CONTEXT_GROWTH.hardMaxPercent / 100;

  const baselineCharacters = Math.max(0, input.baselineCharacters);
  const maximumTotalFromGrowth = Math.floor(baselineCharacters * (1 + targetGrowthPercent));
  const maximumTotalCharacters = Math.min(
    input.maxContextCharacters,
    Math.max(baselineCharacters, maximumTotalFromGrowth)
  );
  const maximumGraphCharacters = Math.max(0, maximumTotalCharacters - baselineCharacters);

  return {
    baselineCharacters,
    maximumTotalCharacters,
    maximumGraphCharacters,
    targetGrowthPercent,
    hardGrowthPercent,
  };
}

/** Mirror context-builder fact render cost (approx). */
export function estimateFactRenderCharacters(fact: AiRetrievedFact): number {
  let n = 48 + (fact.title?.length ?? 0) + (fact.sourceName?.length ?? 0) + 40;
  if (fact.summary) n += 10 + fact.summary.length;
  if (fact.content) n += 10 + Math.min(fact.content.length, 800);
  if (fact.authorityReason) n += 12 + fact.authorityReason.length + 12;
  if (fact.claimStatus) n += 16;
  if (fact.lastVerifiedAt) n += 24;
  if (fact.structuredData) {
    for (const [key, value] of Object.entries(fact.structuredData)) {
      if (value == null || key === "keywords" || key === "fabricatedMetrics") continue;
      const rendered = Array.isArray(value) ? value.join(", ") : String(value);
      if (rendered.trim()) n += key.length + 2 + rendered.length + 1;
    }
  }
  if (fact.warnings.length) n += 12 + fact.warnings.join("; ").length;
  return n + 2;
}

export function mandatoryBaselineChecksum(facts: AiRetrievedFact[]): string {
  return facts
    .map((f) => `${f.sourceType}:${f.sourceId}:${f.authorityRank}`)
    .sort()
    .join("|");
}

function isMandatoryGraphFact(fact: AiRetrievedFact): boolean {
  const warnings = fact.warnings.join(" ");
  if (/conflict|privacy|visibility|graph_conflict/.test(warnings)) return true;
  if (fact.matchedOn.some((m) => /NOT_COMPATIBLE|conflict/i.test(m))) return true;
  if (
    fact.sourceType === "PRINT_METHOD" &&
    fact.matchedOn.some((m) => /COMPATIBLE|SUPPORTS|graph:/i.test(m))
  ) {
    return true;
  }
  return false;
}

function isTwoHop(fact: AiRetrievedFact): boolean {
  return fact.matchedOn.some((m) => /hop:?\s*2|2-hop|two.?hop/i.test(m));
}

function isIndustryOrAudience(fact: AiRetrievedFact): boolean {
  const blob = `${fact.title} ${JSON.stringify(fact.structuredData ?? {})}`.toLowerCase();
  return (
    fact.sourceType === "OTHER" ||
    /audience|industry|use.?case|ngành|đối tượng/.test(blob) ||
    fact.matchedOn.some((m) => /AUDIENCE|INDUSTRY|USE_CASE/i.test(m))
  );
}

function trimSummary(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Compact graph-added facts only — does not alter baseline serializers globally.
 */
export function compactGraphAddedFact(
  fact: AiRetrievedFact,
  consumer: AiRetrievalConsumer
): AiRetrievedFact {
  const planner = consumer === "SEO_TOPIC_PLANNER";
  const next: AiRetrievedFact = {
    ...fact,
    content: null,
    summary: fact.summary,
    structuredData: fact.structuredData ? { ...fact.structuredData } : null,
    warnings: [...fact.warnings],
  };

  if (fact.sourceType === "BLOG_POST") {
    next.summary = planner
      ? trimSummary(
          [
            fact.title,
            fact.sourceUrl ? `url:${fact.sourceUrl}` : null,
            "internal-link candidate",
          ]
            .filter(Boolean)
            .join(" · "),
          160
        )
      : trimSummary(fact.summary ?? fact.title, 220);
    next.content = null;
    next.structuredData = {
      slug: fact.structuredData?.slug ?? null,
      publishedAt: fact.structuredData?.publishedAt ?? null,
      relevance: "graph_links_to",
      internalLinkValue: true,
      ...(planner ? {} : { excerptBounded: true }),
    };
    return next;
  }

  if (fact.sourceType === "KNOWLEDGE_BASE") {
    next.summary = trimSummary(fact.summary, planner ? 120 : 200);
    if (next.structuredData) {
      const keep = new Set([
        "domain",
        "entryType",
        "moqValue",
        "defaultMoq",
        "leadTimeMinDays",
        "leadTimeMaxDays",
        "printCompatibility",
        "embroideryCompatibility",
        "washCompatibility",
        "pricingPolicy",
        "publicPriceHint",
        "capability",
        "process",
        "matchedKeys",
      ]);
      const slim: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(next.structuredData)) {
        if (keep.has(k) && v != null) slim[k] = v;
      }
      next.structuredData = Object.keys(slim).length ? slim : null;
    }
    return next;
  }

  if (fact.sourceType === "PRODUCT" || fact.sourceType === "MANUFACTURING_ASSET") {
    next.summary = trimSummary(fact.summary, planner ? 100 : 160);
    if (next.structuredData) {
      const drop = new Set([
        "longDescription",
        "bodyHtml",
        "fullDescription",
        "descriptionHtml",
        "seoDescription",
      ]);
      for (const k of drop) delete next.structuredData[k];
    }
    return next;
  }

  if (fact.sourceType === "MEDIA_BUNDLE") {
    next.summary = trimSummary(fact.summary, 120);
    if (next.structuredData) {
      next.structuredData = {
        code: next.structuredData.code ?? null,
        contentType: next.structuredData.contentType ?? null,
        status: next.structuredData.status ?? null,
        health: next.structuredData.health ?? null,
        slotCount: next.structuredData.slotCount ?? null,
        slotNames: Array.isArray(next.structuredData.slotNames)
          ? (next.structuredData.slotNames as string[]).slice(0, 8)
          : null,
      };
    }
    // Do not dump all asset metadata into retrieval context
    next.relatedMediaAssetIds = (next.relatedMediaAssetIds ?? []).slice(0, 8);
    return next;
  }

  if (fact.sourceType === "MEDIA_ASSET") {
    next.summary = trimSummary(fact.summary ?? fact.title, 80);
    next.structuredData = {
      role: fact.structuredData?.role ?? null,
      suitability: fact.structuredData?.suitability ?? null,
    };
    return next;
  }

  next.summary = trimSummary(fact.summary, planner ? 120 : 180);
  return next;
}

export function scoreGraphFactValue(input: {
  fact: AiRetrievedFact;
  consumer: AiRetrievalConsumer;
  intent: GraphQueryIntent;
  baselineKeys: Set<string>;
}): { valueScore: number; valueDensity: number; estimatedCharacters: number } {
  const { fact, consumer, intent } = input;
  const estimatedCharacters = Math.max(1, estimateFactRenderCharacters(fact));
  let valueScore = 0;

  valueScore += Math.min(25, fact.relevanceScore);
  valueScore += Math.min(20, fact.authorityRank / 5);

  if (fact.matchedOn.some((m) => /graph:/i.test(m))) valueScore += 8;
  if (fact.matchedOn.some((m) => /EVIDENCED_BY|HAS_MEDIA|LINKS_TO|COMPATIBLE|SUPPORTS/i.test(m))) {
    valueScore += 12;
  }
  if (fact.matchedOn.some((m) => /FEATURED_IN|RELATED_TO|BELONGS_TO/i.test(m))) {
    valueScore -= 10;
  }

  if (intent === "PRODUCT_COMMERCIAL") {
    if (fact.sourceType === "PRODUCT") valueScore += 10;
    if (isIndustryOrAudience(fact)) valueScore += 8;
    if (fact.sourceType === "MANUFACTURING_ASSET") valueScore += 2;
  }
  if (intent === "MANUFACTURING_CAPABILITY" || intent === "TECHNIQUE") {
    if (fact.sourceType === "MANUFACTURING_ASSET" || fact.sourceType === "PRINT_METHOD") {
      valueScore += 14;
    }
    if (fact.sourceType === "PRODUCT") valueScore -= 4;
  }
  if (intent === "OEM_PRIVATE_LABEL") {
    if (fact.sourceType === "KNOWLEDGE_BASE" || fact.sourceType === "MANUFACTURING_ASSET") {
      valueScore += 10;
    }
    if (fact.sourceType === "PRODUCT" || fact.sourceType === "CATEGORY") valueScore -= 8;
  }

  if (fact.sourceType === "MEDIA_BUNDLE") valueScore += 16;
  if (fact.sourceType === "BLOG_POST") {
    valueScore += consumer === "SEO_TOPIC_PLANNER" ? 12 : 8;
  }
  if (fact.sourceType === "PRINT_METHOD") valueScore += 14;

  if (fact.sourceType === "CATEGORY") valueScore -= 20;
  if (fact.sourceType === "KNOWLEDGE_BASE" && (fact.summary?.length ?? 0) > 400) {
    valueScore -= 12;
  }
  if (isTwoHop(fact) && valueScore < 30) valueScore -= 15;

  const key = `${fact.sourceType}:${fact.sourceId}`;
  if (input.baselineKeys.has(key)) valueScore -= 25;

  // genericity penalty
  const summary = (fact.summary ?? "").toLowerCase();
  if (/chính sách chung|general policy|category overview|giới thiệu chung/.test(summary)) {
    valueScore -= 15;
  }

  valueScore = Math.max(0, valueScore);
  return {
    valueScore,
    valueDensity: valueScore / estimatedCharacters,
    estimatedCharacters,
  };
}

function trimReasonForFact(fact: AiRetrievedFact): GraphBudgetRejectionReason {
  if (fact.sourceType === "BLOG_POST") return "optional_blog";
  if (fact.sourceType === "MEDIA_BUNDLE") return "second_media_bundle";
  if (fact.sourceType === "KNOWLEDGE_BASE" && (fact.summary?.length ?? 0) > 200) {
    return "verbose_kb";
  }
  if (fact.sourceType === "MANUFACTURING_ASSET") return "generic_capability";
  if (fact.sourceType === "PRODUCT") return "optional_product";
  if (isIndustryOrAudience(fact)) return "optional_industry_audience";
  if (isTwoHop(fact)) return "low_density_two_hop";
  return "low_value_density";
}

export function enforcePreAssemblyGraphBudget(input: {
  baselineFactIds: Set<string>;
  facts: AiRetrievedFact[];
  consumer: AiRetrievalConsumer;
  query: string;
  maxContextCharacters: number;
  /** Optional override baseline character estimate (header + baseline facts). */
  baselineCharactersOverride?: number;
}): {
  facts: AiRetrievedFact[];
  diagnostics: GraphContextBudgetDiagnostics;
  budget: GraphContextBudget;
} {
  const intent = resolveGraphQueryIntent({
    query: input.query,
    consumer: input.consumer,
  });
  const caps = getIntentGraphFactCaps(intent);
  const baseline = input.facts.filter((f) => input.baselineFactIds.has(f.id));
  const proposedGraph = input.facts.filter((f) => !input.baselineFactIds.has(f.id));

  const baselineChars =
    input.baselineCharactersOverride ??
    baseline.reduce((s, f) => s + estimateFactRenderCharacters(f), 0) + 220;

  const budget = resolveGraphContextBudget({
    baselineCharacters: baselineChars,
    maxContextCharacters: input.maxContextCharacters,
  });

  const baselineKeys = new Set(baseline.map((f) => `${f.sourceType}:${f.sourceId}`));
  const checksum = mandatoryBaselineChecksum(baseline);

  const factsTrimmed: GraphContextBudgetDiagnostics["factsTrimmed"] = [];
  let blogCandidatesTrimmed = 0;
  let mediaItemsTrimmed = 0;

  // Compact graph facts first (consumer-specific payloads)
  let candidates = proposedGraph.map((f) => compactGraphAddedFact(f, input.consumer));

  // Drop categories when intent excludes them
  if (caps.excludeCategory) {
    const kept: AiRetrievedFact[] = [];
    for (const f of candidates) {
      if (f.sourceType === "CATEGORY") {
        factsTrimmed.push({ factId: f.id, reason: "low_value_density" });
        continue;
      }
      kept.push(f);
    }
    candidates = kept;
  }

  // Score + sort by value density
  const scored = candidates
    .map((fact) => {
      const s = scoreGraphFactValue({
        fact,
        consumer: input.consumer,
        intent,
        baselineKeys,
      });
      return { fact, ...s, mandatory: isMandatoryGraphFact(fact) };
    })
    .sort((a, b) => {
      if (a.mandatory !== b.mandatory) return a.mandatory ? -1 : 1;
      return b.valueDensity - a.valueDensity || b.valueScore - a.valueScore;
    });

  const proposedGraphCharacters = scored.reduce((s, r) => s + r.estimatedCharacters, 0);
  const proposedGrowthPercent = estimateContextGrowthPercent(
    budget.baselineCharacters,
    budget.baselineCharacters + proposedGraphCharacters
  );

  const accepted: typeof scored = [];
  const counts = {
    capability: 0,
    knowledge: 0,
    blog: 0,
    product: 0,
    mediaBundle: 0,
    industryAudience: 0,
  };
  let usedChars = 0;

  for (const row of scored) {
    if (row.mandatory) {
      accepted.push(row);
      usedChars += row.estimatedCharacters;
      continue;
    }

    const f = row.fact;
    if (f.sourceType === "MANUFACTURING_ASSET" && counts.capability >= caps.maxCapability) {
      factsTrimmed.push({ factId: f.id, reason: "intent_cap" });
      continue;
    }
    if (f.sourceType === "KNOWLEDGE_BASE" && counts.knowledge >= caps.maxKnowledge) {
      factsTrimmed.push({ factId: f.id, reason: "intent_cap" });
      continue;
    }
    if (f.sourceType === "BLOG_POST" && counts.blog >= caps.maxBlog) {
      factsTrimmed.push({ factId: f.id, reason: "intent_cap" });
      blogCandidatesTrimmed += 1;
      continue;
    }
    if (f.sourceType === "PRODUCT" && counts.product >= caps.maxProduct) {
      factsTrimmed.push({ factId: f.id, reason: "intent_cap" });
      continue;
    }
    if (f.sourceType === "MEDIA_BUNDLE" && counts.mediaBundle >= caps.maxMediaBundle) {
      factsTrimmed.push({ factId: f.id, reason: "second_media_bundle" });
      mediaItemsTrimmed += 1;
      continue;
    }
    if (isIndustryOrAudience(f) && counts.industryAudience >= caps.maxIndustryAudience) {
      factsTrimmed.push({ factId: f.id, reason: "optional_industry_audience" });
      continue;
    }

    if (
      caps.suppressGenericProductDescriptions &&
      f.sourceType === "PRODUCT" &&
      (f.summary?.length ?? 0) > 180 &&
      row.valueScore < 35
    ) {
      factsTrimmed.push({ factId: f.id, reason: "optional_product" });
      continue;
    }

    if (
      caps.suppressGenericFeaturedIn &&
      f.matchedOn.some((m) => /FEATURED_IN/i.test(m)) &&
      !f.matchedOn.some((m) => /LINKS_TO|HAS_MEDIA|BLOG/i.test(m)) &&
      row.valueScore < 28
    ) {
      factsTrimmed.push({ factId: f.id, reason: "low_value_density" });
      continue;
    }

    if (usedChars + row.estimatedCharacters > budget.maximumGraphCharacters) {
      factsTrimmed.push({ factId: f.id, reason: "over_allowance" });
      if (f.sourceType === "BLOG_POST") blogCandidatesTrimmed += 1;
      if (f.sourceType === "MEDIA_BUNDLE" || f.sourceType === "MEDIA_ASSET") {
        mediaItemsTrimmed += 1;
      }
      continue;
    }

    accepted.push(row);
    usedChars += row.estimatedCharacters;
    if (f.sourceType === "MANUFACTURING_ASSET") counts.capability += 1;
    if (f.sourceType === "KNOWLEDGE_BASE") counts.knowledge += 1;
    if (f.sourceType === "BLOG_POST") counts.blog += 1;
    if (f.sourceType === "PRODUCT") counts.product += 1;
    if (f.sourceType === "MEDIA_BUNDLE") counts.mediaBundle += 1;
    if (isIndustryOrAudience(f)) counts.industryAudience += 1;
  }

  // Hard-cap ordered trim if still over (should be rare after allowance gate)
  const hardAllowance = Math.floor(
    budget.baselineCharacters * budget.hardGrowthPercent
  );
  while (
    accepted.reduce((s, r) => s + r.estimatedCharacters, 0) > hardAllowance &&
    accepted.some((r) => !r.mandatory)
  ) {
    // drop lowest density non-mandatory last
    let dropIdx = -1;
    let dropDensity = Infinity;
    for (let i = accepted.length - 1; i >= 0; i--) {
      const row = accepted[i]!;
      if (row.mandatory) continue;
      if (row.valueDensity <= dropDensity) {
        dropDensity = row.valueDensity;
        dropIdx = i;
      }
    }
    if (dropIdx < 0) break;
    const removed = accepted.splice(dropIdx, 1)[0]!;
    factsTrimmed.push({
      factId: removed.fact.id,
      reason: trimReasonForFact(removed.fact),
    });
  }

  let fallbackToBaseline = false;
  if (
    accepted.length === 0 &&
    proposedGraph.length > 0 &&
    budget.maximumGraphCharacters === 0
  ) {
    fallbackToBaseline = true;
    factsTrimmed.push({
      factId: "*",
      reason: "graph_budget_no_value_fit",
    });
  } else if (
    accepted.length === 0 &&
    proposedGraph.length > 0 &&
    scored.every((r) => !r.mandatory && r.valueScore < 12)
  ) {
    fallbackToBaseline = true;
    factsTrimmed.push({
      factId: "*",
      reason: "graph_budget_no_value_fit",
    });
  }

  const acceptedFacts = fallbackToBaseline ? [] : accepted.map((r) => r.fact);
  const acceptedGraphCharacters = acceptedFacts.reduce(
    (s, f) => s + estimateFactRenderCharacters(f),
    0
  );
  const acceptedGrowthPercent = estimateContextGrowthPercent(
    budget.baselineCharacters,
    budget.baselineCharacters + acceptedGraphCharacters
  );

  const valueSum = accepted.reduce((s, r) => s + r.valueScore, 0);

  const diagnostics: GraphContextBudgetDiagnostics = {
    baselineCharacters: budget.baselineCharacters,
    graphAllowance: budget.maximumGraphCharacters,
    proposedGraphCharacters,
    acceptedGraphCharacters,
    finalCharacters: null,
    proposedGrowthPercent: Number(proposedGrowthPercent.toFixed(2)),
    acceptedGrowthPercent: Number(acceptedGrowthPercent.toFixed(2)),
    actualGrowthPercent: null,
    hardCapFallbackUsed: false,
    secondPassTrimUsed: false,
    fallbackToBaseline,
    pathsTrimmed: [],
    scopesTrimmed: [],
    factsTrimmed,
    blogCandidatesTrimmed,
    mediaItemsTrimmed,
    valueRetainedPerCharacter:
      acceptedGraphCharacters > 0
        ? Number((valueSum / acceptedGraphCharacters).toFixed(4))
        : null,
    mandatoryBaselinePreserved: true,
    baselineChecksum: checksum,
  };

  // Respect count budget too
  const countBudget = getAddedFactBudget(input.consumer);
  const cappedAccepted =
    acceptedFacts.length > countBudget.maxTotal
      ? acceptedFacts.slice(0, countBudget.maxTotal)
      : acceptedFacts;

  return {
    facts: [...baseline, ...cappedAccepted],
    diagnostics,
    budget,
  };
}

/**
 * After assembly: if growth exceeds hard/target caps, drop lowest-density graph facts,
 * then fall back to baseline-only when still oversized.
 */
export function assertAndRepairFinalGraphGrowth(input: {
  baselineFactIds: Set<string>;
  facts: AiRetrievedFact[];
  baselineCharacters: number;
  finalCharacters: number;
  hardGrowthPercent?: number;
  targetGrowthPercent?: number;
}): {
  facts: AiRetrievedFact[];
  actualGrowthPercent: number;
  hardCapFallbackUsed: boolean;
  secondPassTrimUsed: boolean;
  fallbackToBaseline: boolean;
  warning: string | null;
} {
  const hardPct = input.hardGrowthPercent ?? GRAPH_CONTEXT_GROWTH.hardMaxPercent;
  const targetPct = input.targetGrowthPercent ?? GRAPH_CONTEXT_GROWTH.targetPercent;
  let facts = input.facts;
  let actual = estimateContextGrowthPercent(input.baselineCharacters, input.finalCharacters);
  let secondPassTrimUsed = false;
  let hardCapFallbackUsed = false;
  let fallbackToBaseline = false;
  let warning: string | null = null;

  const estimateChars = (fs: AiRetrievedFact[]) =>
    fs.reduce((s, f) => s + estimateFactRenderCharacters(f), 0) + 220;

  const dropLowestGraphFact = (): boolean => {
    const graphRows = facts
      .filter((f) => !input.baselineFactIds.has(f.id) && !isMandatoryGraphFact(f))
      .map((fact) => ({
        fact,
        density: scoreGraphFactValue({
          fact,
          consumer: "SEO_BRIEF",
          intent: "GENERAL",
          baselineKeys: new Set(),
        }).valueDensity,
      }))
      .sort((a, b) => a.density - b.density);
    const drop = graphRows[0];
    if (!drop) return false;
    facts = facts.filter((f) => f.id !== drop.fact.id);
    return true;
  };

  if (actual > hardPct) {
    hardCapFallbackUsed = true;
    secondPassTrimUsed = true;
    while (actual > targetPct && dropLowestGraphFact()) {
      actual = estimateContextGrowthPercent(
        input.baselineCharacters,
        estimateChars(facts)
      );
    }
    warning = `graph_hard_cap_second_pass:growth=${actual.toFixed(1)}`;
  } else if (actual > targetPct) {
    secondPassTrimUsed = true;
    while (actual > targetPct && dropLowestGraphFact()) {
      actual = estimateContextGrowthPercent(
        input.baselineCharacters,
        estimateChars(facts)
      );
    }
    warning = `graph_target_second_pass:growth=${actual.toFixed(1)}`;
  }

  if (actual > targetPct) {
    hardCapFallbackUsed = true;
    fallbackToBaseline = true;
    facts = facts.filter((f) => input.baselineFactIds.has(f.id));
    actual = 0;
    warning = "graph_budget_fallback_baseline:oversized_after_trim";
  }

  return {
    facts,
    actualGrowthPercent: Number(actual.toFixed(2)),
    hardCapFallbackUsed,
    secondPassTrimUsed,
    fallbackToBaseline,
    warning,
  };
}

export function formatGraphBudgetWarning(d: GraphContextBudgetDiagnostics): string {
  return [
    `graph_context_budget:baseline=${d.baselineCharacters}`,
    `allowance=${d.graphAllowance}`,
    `proposed=${d.proposedGraphCharacters}(${d.proposedGrowthPercent}%)`,
    `accepted=${d.acceptedGraphCharacters}(${d.acceptedGrowthPercent}%)`,
    d.actualGrowthPercent != null ? `actual=${d.actualGrowthPercent}%` : null,
    d.hardCapFallbackUsed ? "hard_cap_fallback" : null,
    d.fallbackToBaseline ? "fallback_baseline" : null,
    `trimmed=${d.factsTrimmed.length}`,
  ]
    .filter(Boolean)
    .join(";");
}
