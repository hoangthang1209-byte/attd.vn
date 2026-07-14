import type {
  AiRetrievedFact,
  AiRetrievalConflict,
  AiRetrievalSourceType,
} from "@/features/ai-retrieval/ai-retrieval-types";

export type AuthorityDomain =
  | "moq"
  | "lead_time"
  | "material"
  | "capacity"
  | "pricing_policy"
  | "technique_compatibility"
  | "general";

/**
 * Higher rank = more authoritative.
 * Product MOQ (100) > Variant override treated via product adapter (95) >
 * product-linked approved KB (70) > general KB policy (40)
 */
export function getAuthorityRank(
  sourceType: AiRetrievalSourceType,
  domain: AuthorityDomain,
  opts?: { productLinked?: boolean; approved?: boolean }
): number {
  const approvedBoost = opts?.approved ? 5 : 0;
  const productLinked = opts?.productLinked ? 15 : 0;

  switch (domain) {
    case "moq":
      if (sourceType === "PRODUCT") return 100;
      if (sourceType === "KNOWLEDGE_BASE" && opts?.productLinked) return 70 + approvedBoost;
      if (sourceType === "PRICING_POLICY") return 60;
      if (sourceType === "KNOWLEDGE_BASE") return 40 + approvedBoost;
      return 20;
    case "lead_time":
      if (sourceType === "PRODUCT") return 100;
      if (sourceType === "KNOWLEDGE_BASE" && opts?.productLinked) return 65 + approvedBoost;
      if (sourceType === "KNOWLEDGE_BASE") return 40 + approvedBoost;
      return 20;
    case "material":
      if (sourceType === "MATERIAL") return 100;
      if (sourceType === "PRODUCT") return 90;
      if (sourceType === "MANUFACTURING_ASSET") return 70;
      if (sourceType === "KNOWLEDGE_BASE") return 45 + approvedBoost + productLinked;
      return 20;
    case "capacity":
      if (sourceType === "MANUFACTURING_ASSET") return 90;
      if (sourceType === "KNOWLEDGE_BASE") return 50 + approvedBoost;
      return 20;
    case "pricing_policy":
      if (sourceType === "PRICING_POLICY") return 100;
      if (sourceType === "PRODUCT") return 80;
      if (sourceType === "KNOWLEDGE_BASE") return 40 + approvedBoost;
      return 20;
    case "technique_compatibility":
      if (sourceType === "PRINT_METHOD") return 95;
      if (sourceType === "PRODUCT") return 85;
      if (sourceType === "MANUFACTURING_ASSET") return 75;
      if (sourceType === "KNOWLEDGE_BASE") return 50 + approvedBoost;
      return 20;
    default:
      if (sourceType === "PRODUCT") return 80;
      if (sourceType === "MANUFACTURING_ASSET") return 70;
      if (sourceType === "MEDIA_BUNDLE") return 60;
      if (sourceType === "SEO_TOPIC") return 55;
      if (sourceType === "KNOWLEDGE_BASE") return 50 + approvedBoost + productLinked;
      return 30;
  }
}

export function explainAuthorityDecision(
  domain: AuthorityDomain,
  selected: AiRetrievedFact,
  suppressed: AiRetrievedFact[]
): string {
  if (suppressed.length === 0) {
    return `${domain}: selected ${selected.sourceType}:${selected.sourceId} (rank ${selected.authorityRank})`;
  }
  return `${domain}: selected ${selected.sourceType} (rank ${selected.authorityRank}) over ${suppressed
    .map((f) => `${f.sourceType}:${f.sourceId}(r${f.authorityRank})`)
    .join(", ")}`;
}

function structuredConflictValue(
  fact: AiRetrievedFact,
  keys: string[]
): unknown | undefined {
  const data = fact.structuredData;
  if (!data) return undefined;
  for (const key of keys) {
    const value = data[key];
    if (value == null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    return value;
  }
  return undefined;
}

const CONFLICT_SPECS: Array<{ key: string; domain: AuthorityDomain; keys: string[] }> = [
  { key: "MOQ", domain: "moq", keys: ["moqValue", "defaultMoq", "moq"] },
  { key: "lead_time", domain: "lead_time", keys: ["leadTimeMinDays", "leadTimeMaxDays", "leadTime"] },
  { key: "material", domain: "material", keys: ["material", "materialComposition"] },
  { key: "capacity", domain: "capacity", keys: ["capacity"] },
  { key: "public_pricing_policy", domain: "pricing_policy", keys: ["pricingPolicy", "publicPriceHint"] },
  {
    key: "technique_compatibility",
    domain: "technique_compatibility",
    keys: ["printCompatibility", "embroideryCompatibility", "washCompatibility"],
  },
];

function valuesConflict(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return a !== b;
  if (typeof a === "string" && typeof b === "string") {
    return a.trim().toLowerCase() !== b.trim().toLowerCase();
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const na = a.map(String).map((s) => s.toLowerCase()).sort().join("|");
    const nb = b.map(String).map((s) => s.toLowerCase()).sort().join("|");
    return na !== nb;
  }
  return JSON.stringify(a) !== JSON.stringify(b);
}

export function detectFactConflicts(facts: AiRetrievedFact[]): AiRetrievalConflict[] {
  const conflicts: AiRetrievalConflict[] = [];

  for (const spec of CONFLICT_SPECS) {
    const candidates: Array<{ fact: AiRetrievedFact; value: unknown }> = [];
    for (const fact of facts) {
      const value = structuredConflictValue(fact, spec.keys);
      if (value === undefined) continue;
      candidates.push({ fact, value });
    }

    if (candidates.length < 2) continue;

    const first = candidates[0];
    const differing = candidates.filter((c) => valuesConflict(c.value, first.value));
    if (differing.length === 0) continue;

    const all = candidates;
    const sorted = [...all].sort((a, b) => {
      if (b.fact.authorityRank !== a.fact.authorityRank) {
        return b.fact.authorityRank - a.fact.authorityRank;
      }
      const aTime = a.fact.lastVerifiedAt ?? "";
      const bTime = b.fact.lastVerifiedAt ?? "";
      return bTime.localeCompare(aTime);
    });

    const winner = sorted[0];
    const ranksEqual =
      sorted.length > 1 && sorted[0].fact.authorityRank === sorted[1].fact.authorityRank;

    let resolution: AiRetrievalConflict["resolution"] = "HIGHER_AUTHORITY_SELECTED";
    if (ranksEqual) {
      const aTime = sorted[0].fact.lastVerifiedAt;
      const bTime = sorted[1].fact.lastVerifiedAt;
      if (aTime && bTime && aTime !== bTime) {
        resolution = "NEWER_VERIFIED_SELECTED";
      } else {
        resolution = "UNRESOLVED";
      }
    }

    conflicts.push({
      key: spec.key,
      domain: spec.domain,
      facts: all.map((c) => ({
        factId: c.fact.id,
        sourceType: c.fact.sourceType,
        value: c.value,
        authorityRank: c.fact.authorityRank,
        lastVerifiedAt: c.fact.lastVerifiedAt,
      })),
      resolution,
      selectedFactId: resolution === "UNRESOLVED" ? null : winner.fact.id,
      warning:
        resolution === "UNRESOLVED"
          ? `Unresolved ${spec.key} conflict between equal-authority sources.`
          : `${spec.key} conflict resolved via ${resolution}.`,
    });
  }

  return conflicts;
}

export function suppressLowerAuthorityDuplicates(
  facts: AiRetrievedFact[],
  conflicts: AiRetrievalConflict[]
): { facts: AiRetrievedFact[]; suppressedIds: string[]; decisions: string[] } {
  const suppressed = new Set<string>();
  const decisions: string[] = [];

  for (const conflict of conflicts) {
    if (!conflict.selectedFactId) continue;
    const selected = facts.find((f) => f.id === conflict.selectedFactId);
    if (!selected) continue;
    const losers = facts.filter(
      (f) =>
        conflict.facts.some((cf) => cf.factId === f.id) && f.id !== conflict.selectedFactId
    );
    for (const loser of losers) {
      if (loser.authorityRank < selected.authorityRank) {
        suppressed.add(loser.id);
      }
    }
    decisions.push(
      explainAuthorityDecision(conflict.domain as AuthorityDomain, selected, losers)
    );
  }

  return {
    facts: facts.filter((f) => !suppressed.has(f.id)),
    suppressedIds: [...suppressed],
    decisions,
  };
}

export function resolveAuthoritativeFact(
  facts: AiRetrievedFact[],
  domain: AuthorityDomain
): AiRetrievedFact | null {
  if (facts.length === 0) return null;
  return [...facts].sort((a, b) => b.authorityRank - a.authorityRank)[0] ?? null;
}
