import type { AiRetrievedFact } from "@/features/ai-retrieval/ai-retrieval-types";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function tokenize(query: string): string[] {
  return normalizeText(query)
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

export function scoreFactRelevance(
  fact: Pick<
    AiRetrievedFact,
    | "id"
    | "title"
    | "summary"
    | "content"
    | "structuredData"
    | "matchedOn"
    | "authorityRank"
    | "approvedAt"
    | "lastVerifiedAt"
    | "claimStatus"
    | "evidenceUrl"
    | "stale"
    | "reviewDue"
    | "relatedEntityIds"
    | "relatedMediaBundleIds"
  >,
  query: string,
  opts?: {
    productIds?: string[];
    mediaBundleIds?: string[];
    seoTopicIds?: string[];
    entityIds?: string[];
  }
): { score: number; matchedOn: string[] } {
  const matchedOn = new Set(fact.matchedOn);
  let score = 0;
  const q = normalizeText(query);
  const tokens = tokenize(query);
  const title = normalizeText(fact.title);
  const summary = normalizeText(fact.summary ?? "");
  const content = normalizeText(fact.content ?? "").slice(0, 2000);
  const structured = fact.structuredData
    ? normalizeText(
        Object.entries(fact.structuredData)
          .map(([k, v]) => `${k} ${Array.isArray(v) ? v.join(" ") : String(v)}`)
          .join(" ")
      )
    : "";

  if (q && title === q) {
    score += 20;
    matchedOn.add("exact_title");
  } else if (q && title.includes(q)) {
    score += 15;
    matchedOn.add("title_phrase");
  }

  for (const token of tokens) {
    if (title.includes(token)) {
      score += 4;
      matchedOn.add("title_token");
    }
    if (summary.includes(token)) score += 3;
    if (structured.includes(token)) {
      score += 10;
      matchedOn.add("structured_data");
    }
    if (content.includes(token)) {
      score += 5;
      matchedOn.add("content");
    }
  }

  // Authority bonus up to +20
  score += Math.min(20, Math.round(fact.authorityRank / 5));

  if (fact.approvedAt) score += 8;
  if (fact.lastVerifiedAt) score += 6;
  if (fact.claimStatus === "FACT" || fact.claimStatus === "VERIFIED_CLAIM") score += 4;
  if (fact.evidenceUrl) score += 5;

  if (fact.stale) score -= 25;
  else if (fact.reviewDue) score -= 8;
  else if (fact.lastVerifiedAt) score += 4;

  const scopeIds = new Set([
    ...(opts?.productIds ?? []),
    ...(opts?.mediaBundleIds ?? []),
    ...(opts?.seoTopicIds ?? []),
    ...(opts?.entityIds ?? []),
  ]);
  if (scopeIds.size > 0) {
    const related = [
      ...(fact.relatedEntityIds ?? []),
      ...(fact.relatedMediaBundleIds ?? []),
      fact.id.replace(/^(kb|product|mfg|bundle|seo)-/, ""),
    ];
    if (related.some((id) => scopeIds.has(id))) {
      score += 15;
      matchedOn.add("entity_scope");
    }
  }

  return { score: Math.max(0, score), matchedOn: [...matchedOn] };
}

export function sortFactsByScore(facts: AiRetrievedFact[]): AiRetrievedFact[] {
  return [...facts].sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    if (b.authorityRank !== a.authorityRank) return b.authorityRank - a.authorityRank;
    return (b.lastVerifiedAt ?? "").localeCompare(a.lastVerifiedAt ?? "");
  });
}
