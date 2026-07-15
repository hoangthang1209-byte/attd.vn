/**
 * Controlled Retrieval evaluation dataset for Sprint 12.2 preview.
 * Graph expansion stays disabled in production.
 */

export type GraphEvalExpectedPath = {
  fromEntityType: string;
  relationshipType: string;
  toEntityType: string;
  note?: string;
};

export type GraphEvalCase = {
  id: string;
  query: string;
  description: string;
  expectedPaths: GraphEvalExpectedPath[];
  irrelevantPathHints: string[];
};

export const KNOWLEDGE_GRAPH_EVALUATION_CASES: GraphEvalCase[] = [
  {
    id: "polo-corp",
    query: "áo polo đồng phục công ty",
    description: "Corporate polo uniform intent",
    expectedPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "SUITABLE_FOR", toEntityType: "USE_CASE" },
      { fromEntityType: "PRODUCT", relationshipType: "TARGETS", toEntityType: "AUDIENCE" },
      { fromEntityType: "PRODUCT", relationshipType: "BELONGS_TO", toEntityType: "PRODUCT_CATEGORY" },
    ],
    irrelevantPathHints: ["CONFIDENTIAL", "CUSTOMER", "SUPPLIER"],
  },
  {
    id: "corporate-gift",
    query: "quà tặng doanh nghiệp",
    description: "Corporate gifting",
    expectedPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "SUITABLE_FOR", toEntityType: "USE_CASE" },
      { fromEntityType: "PRODUCT", relationshipType: "TARGETS", toEntityType: "INDUSTRY" },
    ],
    irrelevantPathHints: ["Quote", "CRM"],
  },
  {
    id: "bulk-tee-factory",
    query: "xưởng may áo thun số lượng lớn",
    description: "Bulk t-shirt manufacturing",
    expectedPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "HAS_CAPABILITY", toEntityType: "CAPABILITY" },
      { fromEntityType: "CAPABILITY", relationshipType: "EVIDENCED_BY", toEntityType: "CASE_STUDY" },
    ],
    irrelevantPathHints: ["MOQ copied into graph metadata"],
  },
  {
    id: "screen-print-bulk",
    query: "in lụa số lượng lớn",
    description: "Bulk silk-screen printing",
    expectedPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "SUPPORTS", toEntityType: "PRINT_METHOD" },
      { fromEntityType: "MATERIAL", relationshipType: "COMPATIBLE_WITH", toEntityType: "PRINT_METHOD" },
    ],
    irrelevantPathHints: ["unpublished Blog PUBLIC"],
  },
  {
    id: "oem-private-label",
    query: "OEM private label",
    description: "OEM / private label capability",
    expectedPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "HAS_CAPABILITY", toEntityType: "CAPABILITY" },
      { fromEntityType: "CAPABILITY", relationshipType: "HAS_MEDIA", toEntityType: "MEDIA_BUNDLE" },
    ],
    irrelevantPathHints: ["pricing tiers", "cost"],
  },
  {
    id: "bank-uniform",
    query: "đồng phục ngân hàng",
    description: "Banking industry uniforms",
    expectedPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "TARGETS", toEntityType: "INDUSTRY" },
      { fromEntityType: "PRODUCT", relationshipType: "SUITABLE_FOR", toEntityType: "USE_CASE" },
      { fromEntityType: "SEO_TOPIC", relationshipType: "LINKS_TO", toEntityType: "BLOG_POST" },
    ],
    irrelevantPathHints: ["Customer account"],
  },
];

export type GraphEvalComparison = {
  caseId: string;
  query: string;
  baselineFactCount: number;
  previewScopeEntityCount: number;
  relevantPathsFound: number;
  expectedPathCount: number;
  irrelevantPathHits: number;
  contextDeltaChars: number;
  warnings: string[];
};

/**
 * Deterministic evaluator contract — compares counts/path presence only.
 * No AI judge.
 */
export function evaluateGraphExpansionPreview(input: {
  caseId: string;
  query: string;
  baselineFactCount: number;
  previewMatchedOn: string[];
  previewScopeEntityCount: number;
  baselineContextChars: number;
  previewContextChars: number;
  expectedPaths: GraphEvalExpectedPath[];
  irrelevantPathHints: string[];
}): GraphEvalComparison {
  const matched = input.previewMatchedOn.join(" | ").toLowerCase();
  let relevantPathsFound = 0;
  for (const path of input.expectedPaths) {
    const token = `${path.relationshipType}`.toLowerCase();
    const from = path.fromEntityType.toLowerCase();
    const to = path.toEntityType.toLowerCase();
    if (matched.includes(token) && (matched.includes(from) || matched.includes(to))) {
      relevantPathsFound += 1;
    }
  }
  let irrelevantPathHits = 0;
  for (const hint of input.irrelevantPathHints) {
    if (matched.includes(hint.toLowerCase())) irrelevantPathHits += 1;
  }
  return {
    caseId: input.caseId,
    query: input.query,
    baselineFactCount: input.baselineFactCount,
    previewScopeEntityCount: input.previewScopeEntityCount,
    relevantPathsFound,
    expectedPathCount: input.expectedPaths.length,
    irrelevantPathHits,
    contextDeltaChars: input.previewContextChars - input.baselineContextChars,
    warnings: [],
  };
}
