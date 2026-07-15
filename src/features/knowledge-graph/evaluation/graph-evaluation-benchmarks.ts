/**
 * Benchmark expectations for Sprint 12.2 governed retrieval evaluation.
 * Deterministic path matching only — no LLM judge.
 */

export type GraphEvalPathSpec = {
  fromEntityType: string;
  relationshipType: string;
  toEntityType: string;
  maxDepth?: 1 | 2;
  required?: boolean;
  note?: string;
};

export type GraphEvalBenchmark = {
  id: string;
  query: string;
  description: string;
  /** Cohort product source IDs used as retrieval scope seeds. */
  seedProductIds: string[];
  seedKnowledgeEntryIds?: string[];
  requiredPaths: GraphEvalPathSpec[];
  optionalPaths: GraphEvalPathSpec[];
  prohibitedPathHints: string[];
  expectedSourceTypes: string[];
  maxUsefulDepth: 1 | 2;
  visibilityExpectation: "PUBLIC" | "INTERNAL";
  dataGaps: string[];
};

const POLO = "cmqb62481001trwodp6exjpxy";
const POLO_BASIC = "cmqb624ab001xrwodj6tuht2s";
const TEE = "cmqb6232q0001rwod8xocy48r";
const TEE_EXPORT = "cmqb623rm0011rwoduuf3rybo";
const GIFT_TOTE = "cmqfmckvs002bk0041n8hbx2u";
const GIFT_COMBO = "cmqfmcqjk0039k004acvbp83s";
const GIFT_CONF = "cmqfmcrph003fk0044ki1ihbr";

export const GRAPH_EVALUATION_BENCHMARKS: GraphEvalBenchmark[] = [
  {
    id: "polo-corporate",
    query: "áo polo đồng phục công ty",
    description: "Corporate polo uniform intent",
    seedProductIds: [POLO, POLO_BASIC],
    seedKnowledgeEntryIds: ["cmqewjysi000fkz04jpj2wprf", "cmqfhl8k4000fl704qmz9pwws"],
    requiredPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "SUITABLE_FOR", toEntityType: "USE_CASE", required: true },
      { fromEntityType: "PRODUCT", relationshipType: "TARGETS", toEntityType: "AUDIENCE", required: true },
      { fromEntityType: "PRODUCT", relationshipType: "BELONGS_TO", toEntityType: "PRODUCT_CATEGORY", required: true },
    ],
    optionalPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "TARGETS", toEntityType: "INDUSTRY" },
      { fromEntityType: "PRODUCT", relationshipType: "HAS_CAPABILITY", toEntityType: "CAPABILITY" },
      { fromEntityType: "PRODUCT", relationshipType: "FEATURED_IN", toEntityType: "BLOG_POST" },
      { fromEntityType: "PRODUCT", relationshipType: "DOCUMENTED_BY", toEntityType: "KNOWLEDGE_ENTRY" },
      { fromEntityType: "SEO_TOPIC", relationshipType: "HAS_MEDIA", toEntityType: "MEDIA_BUNDLE" },
      { fromEntityType: "SEO_TOPIC", relationshipType: "LINKS_TO", toEntityType: "BLOG_POST" },
    ],
    prohibitedPathHints: ["CUSTOMER", "SUPPLIER", "CONFIDENTIAL", "Quote"],
    expectedSourceTypes: ["PRODUCT", "KNOWLEDGE_BASE", "BLOG_POST", "MANUFACTURING_ASSET"],
    maxUsefulDepth: 1,
    visibilityExpectation: "PUBLIC",
    dataGaps: [
      "SeoTopic=0 — SEO_TOPIC paths unavailable",
      "MediaBundle=0 — HAS_MEDIA paths unavailable",
      "PrintMethod=0 — SUPPORTS PRINT_METHOD unavailable",
    ],
  },
  {
    id: "corporate-gift",
    query: "quà tặng doanh nghiệp",
    description: "Corporate gifting",
    seedProductIds: [GIFT_TOTE, GIFT_COMBO, GIFT_CONF],
    seedKnowledgeEntryIds: ["cmqfhlew8000pl70420xcnma4", "cmqfhlc98000ll7046uycjtld"],
    requiredPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "SUITABLE_FOR", toEntityType: "USE_CASE", required: true },
      { fromEntityType: "PRODUCT", relationshipType: "TARGETS", toEntityType: "AUDIENCE", required: true },
    ],
    optionalPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "TARGETS", toEntityType: "INDUSTRY" },
      { fromEntityType: "PRODUCT", relationshipType: "FEATURED_IN", toEntityType: "BLOG_POST" },
      { fromEntityType: "PRODUCT", relationshipType: "DOCUMENTED_BY", toEntityType: "KNOWLEDGE_ENTRY" },
    ],
    prohibitedPathHints: ["CUSTOMER", "SUPPLIER", "CRM"],
    expectedSourceTypes: ["PRODUCT", "KNOWLEDGE_BASE", "BLOG_POST"],
    maxUsefulDepth: 1,
    visibilityExpectation: "PUBLIC",
    dataGaps: ["MediaBundle=0", "SeoTopic=0"],
  },
  {
    id: "bulk-tee-factory",
    query: "xưởng may áo thun số lượng lớn",
    description: "Bulk t-shirt manufacturing",
    seedProductIds: [TEE, TEE_EXPORT, "cmqb6238h0005rwod5zedrfh4"],
    seedKnowledgeEntryIds: ["cmqfhll1x000zl704p8xldt92", "cmqfmd612004fk0042poahscs"],
    requiredPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "HAS_CAPABILITY", toEntityType: "CAPABILITY", required: true },
      { fromEntityType: "PRODUCT", relationshipType: "BELONGS_TO", toEntityType: "PRODUCT_CATEGORY", required: true },
    ],
    optionalPaths: [
      { fromEntityType: "CAPABILITY", relationshipType: "SUITABLE_FOR", toEntityType: "USE_CASE" },
      { fromEntityType: "CAPABILITY", relationshipType: "EVIDENCED_BY", toEntityType: "KNOWLEDGE_ENTRY" },
      { fromEntityType: "PRODUCT", relationshipType: "DOCUMENTED_BY", toEntityType: "KNOWLEDGE_ENTRY" },
      { fromEntityType: "CAPABILITY", relationshipType: "HAS_MEDIA", toEntityType: "MEDIA_BUNDLE" },
    ],
    prohibitedPathHints: ["CUSTOMER", "cost copied into graph"],
    expectedSourceTypes: ["PRODUCT", "MANUFACTURING_ASSET", "KNOWLEDGE_BASE"],
    maxUsefulDepth: 2,
    visibilityExpectation: "PUBLIC",
    dataGaps: ["MediaBundle=0 — CAPABILITY HAS_MEDIA blocked", "No CASE_STUDY entity type in live graph"],
  },
  {
    id: "screen-print-bulk",
    query: "in lụa số lượng lớn",
    description: "Bulk silk-screen printing",
    seedProductIds: [TEE, POLO],
    seedKnowledgeEntryIds: [],
    requiredPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "HAS_CAPABILITY", toEntityType: "CAPABILITY", required: true },
    ],
    optionalPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "SUPPORTS", toEntityType: "PRINT_METHOD" },
      { fromEntityType: "MATERIAL", relationshipType: "COMPATIBLE_WITH", toEntityType: "PRINT_METHOD" },
      { fromEntityType: "CAPABILITY", relationshipType: "SUITABLE_FOR", toEntityType: "USE_CASE" },
    ],
    prohibitedPathHints: ["CUSTOMER", "unpublished Blog as PUBLIC fact"],
    expectedSourceTypes: ["PRODUCT", "MANUFACTURING_ASSET"],
    maxUsefulDepth: 1,
    visibilityExpectation: "PUBLIC",
    dataGaps: ["PrintMethod=0 — SUPPORTS/COMPATIBLE_WITH print paths blocked"],
  },
  {
    id: "oem-private-label",
    query: "OEM private label",
    description: "OEM / private label capability",
    seedProductIds: [TEE_EXPORT, TEE],
    seedKnowledgeEntryIds: ["cmqfhlhcx000tl704d30ai8qf"],
    requiredPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "HAS_CAPABILITY", toEntityType: "CAPABILITY", required: true },
      { fromEntityType: "PRODUCT", relationshipType: "DOCUMENTED_BY", toEntityType: "KNOWLEDGE_ENTRY", required: true },
    ],
    optionalPaths: [
      { fromEntityType: "CAPABILITY", relationshipType: "HAS_MEDIA", toEntityType: "MEDIA_BUNDLE" },
      { fromEntityType: "PRODUCT", relationshipType: "TARGETS", toEntityType: "AUDIENCE" },
    ],
    prohibitedPathHints: ["pricing tiers", "cost", "CUSTOMER"],
    expectedSourceTypes: ["PRODUCT", "KNOWLEDGE_BASE", "MANUFACTURING_ASSET"],
    maxUsefulDepth: 1,
    visibilityExpectation: "PUBLIC",
    dataGaps: ["MediaBundle=0"],
  },
  {
    id: "bank-uniform",
    query: "đồng phục ngân hàng",
    description: "Banking industry uniforms",
    seedProductIds: [POLO, POLO_BASIC, "cmqb62411001hrwod85mtbv25"],
    seedKnowledgeEntryIds: ["cmqewjysi000fkz04jpj2wprf"],
    requiredPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "TARGETS", toEntityType: "INDUSTRY", required: true },
      { fromEntityType: "PRODUCT", relationshipType: "SUITABLE_FOR", toEntityType: "USE_CASE", required: true },
    ],
    optionalPaths: [
      { fromEntityType: "PRODUCT", relationshipType: "TARGETS", toEntityType: "AUDIENCE" },
      { fromEntityType: "PRODUCT", relationshipType: "FEATURED_IN", toEntityType: "BLOG_POST" },
      { fromEntityType: "SEO_TOPIC", relationshipType: "LINKS_TO", toEntityType: "BLOG_POST" },
    ],
    prohibitedPathHints: ["Customer account", "SUPPLIER"],
    expectedSourceTypes: ["PRODUCT", "KNOWLEDGE_BASE", "BLOG_POST"],
    maxUsefulDepth: 1,
    visibilityExpectation: "PUBLIC",
    dataGaps: ["SeoTopic=0 — SEO_TOPIC LINKS_TO unavailable"],
  },
];

export function getBenchmarkById(id: string): GraphEvalBenchmark | undefined {
  return GRAPH_EVALUATION_BENCHMARKS.find((b) => b.id === id);
}

/** @deprecated alias kept for Sprint 12.1 UI/tests — prefer GRAPH_EVALUATION_BENCHMARKS */
export const KNOWLEDGE_GRAPH_EVALUATION_CASES = GRAPH_EVALUATION_BENCHMARKS.map((b) => ({
  id: b.id,
  query: b.query,
  description: b.description,
  expectedPaths: b.requiredPaths,
  irrelevantPathHints: b.prohibitedPathHints,
}));
