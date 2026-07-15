/**
 * Sprint 12.2 failure map — measured from run cmrm9w69z0000rwnk91alijht.
 * Used to drive precision policy; do not tune from aggregates alone.
 */

export const SPRINT_12_2_EVALUATION_RUN_ID = "cmrm9w69z0000rwnk91alijht";

export type FailurePathType =
  | "PRODUCT_CATEGORY_SCOPE"
  | "POLICY_SCOPE"
  | "CROSS_INTENT_LEAK"
  | "MISSING_PRINT_METHOD"
  | "MISSING_SEO_TOPIC"
  | "MISSING_MEDIA_BUNDLE"
  | "CONTEXT_GROWTH"
  | "LOW_PRECISION_NOISE";

export const SPRINT_12_2_FAILURE_MAP: Array<{
  benchmarkId: string;
  consumers: string[];
  primaryFailures: FailurePathType[];
  noiseEntityTypes: string[];
  notes: string;
}> = [
  {
    benchmarkId: "polo-corporate",
    consumers: ["SEO_TOPIC_PLANNER", "SEO_BRIEF"],
    primaryFailures: ["CONTEXT_GROWTH", "POLICY_SCOPE", "MISSING_SEO_TOPIC", "MISSING_MEDIA_BUNDLE"],
    noiseEntityTypes: ["POLICY"],
    notes: "Precision OK (~0.89); growth ~100% from blogs+KB+category scopes.",
  },
  {
    benchmarkId: "corporate-gift",
    consumers: ["SEO_TOPIC_PLANNER", "SEO_BRIEF"],
    primaryFailures: ["PRODUCT_CATEGORY_SCOPE", "LOW_PRECISION_NOISE"],
    noiseEntityTypes: ["PRODUCT_CATEGORY"],
    notes: "Growth fine; precision 0.75 from BELONGS_TO category scopes.",
  },
  {
    benchmarkId: "bulk-tee-factory",
    consumers: ["SEO_TOPIC_PLANNER", "SEO_BRIEF"],
    primaryFailures: ["POLICY_SCOPE", "CONTEXT_GROWTH", "MISSING_MEDIA_BUNDLE"],
    noiseEntityTypes: ["POLICY"],
    notes: "MOQ policies expand via DOCUMENTED_BY even without policy intent.",
  },
  {
    benchmarkId: "screen-print-bulk",
    consumers: ["SEO_TOPIC_PLANNER", "SEO_BRIEF"],
    primaryFailures: [
      "MISSING_PRINT_METHOD",
      "CROSS_INTENT_LEAK",
      "POLICY_SCOPE",
      "LOW_PRECISION_NOISE",
    ],
    noiseEntityTypes: ["USE_CASE", "AUDIENCE", "INDUSTRY", "POLICY", "KNOWLEDGE_ENTRY", "BLOG_POST", "PRODUCT_CATEGORY"],
    notes: "Not improved. PrintMethod=0; expansion leaked polo/bank/gift concepts from shared product roots.",
  },
  {
    benchmarkId: "oem-private-label",
    consumers: ["SEO_TOPIC_PLANNER", "SEO_BRIEF"],
    primaryFailures: ["POLICY_SCOPE", "PRODUCT_CATEGORY_SCOPE", "CONTEXT_GROWTH"],
    noiseEntityTypes: ["POLICY", "PRODUCT_CATEGORY"],
    notes: "Precision 0.60; category + MOQ policy noise.",
  },
  {
    benchmarkId: "bank-uniform",
    consumers: ["SEO_TOPIC_PLANNER", "SEO_BRIEF"],
    primaryFailures: ["CONTEXT_GROWTH", "POLICY_SCOPE", "PRODUCT_CATEGORY_SCOPE", "MISSING_SEO_TOPIC"],
    noiseEntityTypes: ["POLICY", "PRODUCT_CATEGORY", "KNOWLEDGE_ENTRY"],
    notes: "Worst growth (~176%); blogs + category + policy inflate context.",
  },
];
