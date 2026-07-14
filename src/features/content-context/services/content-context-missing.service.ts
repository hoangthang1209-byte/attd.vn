import type {
  ContentContextConflict,
  ContentContextFact,
  ContentContextMissingFact,
  ContentContextProhibitedClaim,
} from "@/features/content-context/content-context.types";
import type { ContentContextProfile } from "@/features/content-context/content-context-profiles";

export function buildProhibitedClaims(input: {
  omitted: Array<{ reason: string; count: number }>;
  conflicts: ContentContextConflict[];
  facts: ContentContextFact[];
}): ContentContextProhibitedClaim[] {
  const claims: ContentContextProhibitedClaim[] = [
    {
      key: "no_invented_metrics",
      reason: "Do not invent search volume, KD, CPC or ranking claims.",
      examples: ["search volume", "keyword difficulty", "CPC"],
      severity: "HIGH",
    },
    {
      key: "no_cost_margin",
      reason: "Do not state internal cost, margin, or supplier pricing.",
      examples: ["cost", "margin", "supplier price"],
      severity: "BLOCKING",
    },
    {
      key: "no_private_customers",
      reason: "Do not name customers without approved public case-study source.",
      examples: ["customer name"],
      severity: "HIGH",
    },
    {
      key: "no_unowned_factory_claims",
      reason: "Do not claim factory ownership unless approved PUBLIC fact exists.",
      examples: ["owned factory"],
      severity: "HIGH",
    },
  ];

  for (const omit of input.omitted) {
    claims.push({
      key: `omitted:${omit.reason}`,
      reason: `Retrieval omitted data: ${omit.reason} (${omit.count}). Do not invent substitutions.`,
      examples: [],
      severity: "MEDIUM",
    });
  }

  for (const conflict of input.conflicts) {
    if (conflict.resolution === "UNRESOLVED") {
      claims.push({
        key: `conflict:${conflict.key}`,
        reason: `Unresolved conflict on ${conflict.key} — do not state a definitive public value.`,
        sourceId: conflict.selectedFactId,
        examples: [],
        severity: /moq|lead.?time/i.test(conflict.key) ? "BLOCKING" : "HIGH",
      });
    }
  }

  for (const fact of input.facts) {
    if (fact.claimStatus === "NEEDS_EVIDENCE" || fact.claimStatus === "MARKETING_CLAIM") {
      claims.push({
        key: `evidence:${fact.factId}`,
        reason: `Claim requires evidence before asserting as verified (${fact.sourceTitle}).`,
        sourceId: fact.sourceId,
        examples: [fact.statement.slice(0, 120)],
        severity: "HIGH",
      });
    }
  }

  return dedupeProhibited(claims);
}

function dedupeProhibited(claims: ContentContextProhibitedClaim[]): ContentContextProhibitedClaim[] {
  const map = new Map<string, ContentContextProhibitedClaim>();
  for (const c of claims) map.set(c.key, c);
  return [...map.values()];
}

export function deriveMissingFacts(input: {
  profile: ContentContextProfile;
  outline: Array<{ heading: string; purpose?: string }>;
  requiredSections: string[];
  conflicts: ContentContextConflict[];
  facts: ContentContextFact[];
  hasCta: boolean;
  hasMediaBundle: boolean;
  missingMediaSlots: string[];
  brandMissing: boolean;
}): ContentContextMissingFact[] {
  const missing: ContentContextMissingFact[] = [];
  const textBlob = [
    ...input.outline.map((o) => `${o.heading} ${o.purpose ?? ""}`),
    ...input.requiredSections,
    ...input.facts.map((f) => f.statement),
  ]
    .join(" ")
    .toLowerCase();

  const need = (key: string, description: string, sections: string[], blocking = false) => {
    missing.push({
      key,
      description,
      requiredForSections: sections,
      severity: blocking ? "BLOCKING" : "MEDIUM",
      suggestedKnowledgeDomain: key.includes("moq") || key.includes("lead") ? "sales" : "seo",
      blocking,
    });
  };

  if (input.profile.purpose === "SEO_LANDING_PAGE") {
    if (!/moq|minimum order|đơn hàng tối thiểu/.test(textBlob)) {
      need("authoritative_moq", "Missing authoritative MOQ for landing page.", ["offer", "CTA"], false);
    }
    if (!/lead time|thời gian|delivery|giao hàng/.test(textBlob)) {
      need("lead_time", "Missing lead time capability fact.", ["capability"], false);
    }
    if (!/factory|capability|năng lực|sản xuất/.test(textBlob)) {
      need("factory_capability", "Missing factory capability fact.", ["capability"], false);
    }
    if (!input.hasCta) {
      need("cta", "Missing CTA for commercial landing.", ["CTA"], true);
    }
    if (input.missingMediaSlots.includes("HERO") || input.missingMediaSlots.includes("FEATURED")) {
      need("hero_image", "Missing Hero/Featured media slot.", ["hero"], false);
    }
  }

  if (input.profile.contentType === "ARTICLE" || input.profile.purpose === "SEO_ARTICLE") {
    if (!/material|vải|parệt liệu/.test(textBlob)) {
      need("material_explanation", "Missing material explanation for article depth.", ["materials"], false);
    }
    if (!/process|quy trình|manufactur/.test(textBlob)) {
      need("process_facts", "Missing process facts.", ["process"], false);
    }
  }

  if (!input.hasMediaBundle) {
    need("media_bundle", "No Media Bundle linked to topic.", ["media"], false);
  }
  for (const slot of input.missingMediaSlots) {
    need(`media_slot_${slot}`, `Missing required media slot: ${slot}`, ["media"], false);
  }
  if (input.brandMissing) {
    need("brand_voice", "Brand voice / tone facts missing from Retrieval.", ["brand"], false);
  }

  for (const conflict of input.conflicts) {
    if (conflict.resolution === "UNRESOLVED") {
      need(
        `resolve_conflict_${conflict.key}`,
        `Resolve conflict before public claim: ${conflict.key}`,
        ["facts"],
        /moq|lead/i.test(conflict.key),
      );
    }
  }

  return missing;
}
