/**
 * Governed curation manifest for evaluation cohort.
 * Applied as DRAFT curated relationships only; approval is explicit.
 */

import type { KnowledgeBaseVisibility, KnowledgeGraphRelationshipType } from "@prisma/client";

export const GRAPH_CURATION_MANIFEST_VERSION = "12.2.0";

export type CurationManifestItem = {
  id: string;
  from: { sourceType: string; sourceId: string };
  relationshipType: KnowledgeGraphRelationshipType;
  to: { sourceType: string; sourceId: string };
  visibility: KnowledgeBaseVisibility;
  confidence: number;
  sourceEntryId?: string | null;
  evidenceUrl?: string | null;
  reason: string;
  benchmarkTags: string[];
  expectedRelevance: "HIGH" | "MEDIUM" | "LOW";
  /** Fixtures deliberately INTERNAL for visibility-safety checks. */
  evaluationFixture?: "INTERNAL_PATH" | "PUBLIC_PATH";
};

const P = {
  polo: { sourceType: "Product", sourceId: "cmqb62481001trwodp6exjpxy" },
  poloBasic: { sourceType: "Product", sourceId: "cmqb624ab001xrwodj6tuht2s" },
  poloPremium: { sourceType: "Product", sourceId: "cmqb62411001hrwod85mtbv25" },
  tee: { sourceType: "Product", sourceId: "cmqb6232q0001rwod8xocy48r" },
  tee220: { sourceType: "Product", sourceId: "cmqb6238h0005rwod5zedrfh4" },
  teeExport: { sourceType: "Product", sourceId: "cmqb623rm0011rwoduuf3rybo" },
  tote: { sourceType: "Product", sourceId: "cmqfmckvs002bk0041n8hbx2u" },
  bottle: { sourceType: "Product", sourceId: "cmqfmcmvp002nk004u3nodsar" },
  giftCombo: { sourceType: "Product", sourceId: "cmqfmcqjk0039k004acvbp83s" },
  giftConf: { sourceType: "Product", sourceId: "cmqfmcrph003fk0044ki1ihbr" },
} as const;

const V = {
  corpUniform: { sourceType: "MediaVocabularyTerm", sourceId: "mvt_use_case_dong_phuc_cong_ty" },
  giftCustomer: { sourceType: "MediaVocabularyTerm", sourceId: "mvt_use_case_qua_tang_khach_hang" },
  giftStaff: { sourceType: "MediaVocabularyTerm", sourceId: "mvt_use_case_qua_tang_nhan_vien" },
  merch: { sourceType: "MediaVocabularyTerm", sourceId: "mvt_use_case_merchandise" },
  enterprise: { sourceType: "MediaVocabularyTerm", sourceId: "mvt_audience_doanh_nghiep" },
  employees: { sourceType: "MediaVocabularyTerm", sourceId: "mvt_audience_nhan_vien" },
  banking: { sourceType: "MediaVocabularyTerm", sourceId: "mvt_industry_ngan_hang" },
  industryEnterprise: { sourceType: "MediaVocabularyTerm", sourceId: "mvt_industry_doanh_nghiep" },
  manufacturing: { sourceType: "MediaVocabularyTerm", sourceId: "mvt_industry_san_xuat" },
} as const;

const C = {
  production: { sourceType: "ManufacturingAsset", sourceId: "cmr7955oa0001rwf26n0eqm7w" },
  printing: { sourceType: "ManufacturingAsset", sourceId: "cmr795734000hrwf22f6i3ph0" },
  qc: { sourceType: "ManufacturingAsset", sourceId: "cmr7956820005rwf22ivuohfo" },
  warehouse: { sourceType: "ManufacturingAsset", sourceId: "cmr7956sv000drwf2dyyhs5u4" },
} as const;

const K = {
  poloKb: { sourceType: "KnowledgeBaseEntry", sourceId: "cmqewjysi000fkz04jpj2wprf" },
  poloSi: { sourceType: "KnowledgeBaseEntry", sourceId: "cmqfhl8k4000fl704qmz9pwws" },
  giftKb: { sourceType: "KnowledgeBaseEntry", sourceId: "cmqfhlew8000pl70420xcnma4" },
  toteKb: { sourceType: "KnowledgeBaseEntry", sourceId: "cmqfhlc98000ll7046uycjtld" },
  oemKb: { sourceType: "KnowledgeBaseEntry", sourceId: "cmqfhlhcx000tl704d30ai8qf" },
  moqKb: { sourceType: "KnowledgeBaseEntry", sourceId: "cmqfhll1x000zl704p8xldt92" },
  moqPolicy: { sourceType: "KnowledgeBaseEntry", sourceId: "cmqfmd612004fk0042poahscs" },
} as const;

const B = {
  giftBlog: { sourceType: "BlogPost", sourceId: "cmqfmcxpe003yk004ck91s7al" },
  poloBlog: { sourceType: "BlogPost", sourceId: "cmqfmcy7e003zk004r693fi4x" },
  poloGuide: { sourceType: "BlogPost", sourceId: "cmqe2e7pt0000la04wauw7lj6" },
  warehouseBlog: { sourceType: "BlogPost", sourceId: "cmqfmcvv7003vk004b5gycw4v" },
} as const;

function item(
  partial: Omit<CurationManifestItem, "confidence" | "expectedRelevance"> &
    Partial<Pick<CurationManifestItem, "confidence" | "expectedRelevance">>
): CurationManifestItem {
  return {
    confidence: 90,
    expectedRelevance: "HIGH",
    ...partial,
  };
}

export const GRAPH_CURATION_MANIFEST: CurationManifestItem[] = [
  // --- Polo corporate ---
  item({
    id: "polo-suitable-corp-uniform",
    from: P.polo,
    relationshipType: "SUITABLE_FOR",
    to: V.corpUniform,
    visibility: "PUBLIC",
    sourceEntryId: K.poloKb.sourceId,
    reason: "Polo is commercial corporate-uniform hero SKU",
    benchmarkTags: ["polo-corporate", "bank-uniform"],
    evaluationFixture: "PUBLIC_PATH",
  }),
  item({
    id: "polo-targets-enterprise",
    from: P.polo,
    relationshipType: "TARGETS",
    to: V.enterprise,
    visibility: "PUBLIC",
    sourceEntryId: K.poloKb.sourceId,
    reason: "Enterprise B2B audience for corporate polo",
    benchmarkTags: ["polo-corporate", "bank-uniform"],
  }),
  item({
    id: "polo-targets-banking",
    from: P.polo,
    relationshipType: "TARGETS",
    to: V.banking,
    visibility: "PUBLIC",
    sourceEntryId: K.poloKb.sourceId,
    reason: "Banking uniform industry targeting",
    benchmarkTags: ["bank-uniform"],
  }),
  item({
    id: "polo-basic-suitable-corp",
    from: P.poloBasic,
    relationshipType: "SUITABLE_FOR",
    to: V.corpUniform,
    visibility: "PUBLIC",
    sourceEntryId: K.poloSi.sourceId,
    reason: "Basic polo for corporate uniforms",
    benchmarkTags: ["polo-corporate", "bank-uniform"],
  }),
  item({
    id: "polo-basic-targets-enterprise",
    from: P.poloBasic,
    relationshipType: "TARGETS",
    to: V.enterprise,
    visibility: "PUBLIC",
    reason: "Enterprise audience for basic polo",
    benchmarkTags: ["polo-corporate"],
  }),
  item({
    id: "polo-premium-targets-banking",
    from: P.poloPremium,
    relationshipType: "TARGETS",
    to: V.banking,
    visibility: "PUBLIC",
    reason: "Premium polo for banking industry programs",
    benchmarkTags: ["bank-uniform"],
  }),
  item({
    id: "polo-documented-kb",
    from: P.polo,
    relationshipType: "DOCUMENTED_BY",
    to: K.poloKb,
    visibility: "PUBLIC",
    sourceEntryId: K.poloKb.sourceId,
    reason: "KB product-group entry documents polo category",
    benchmarkTags: ["polo-corporate"],
  }),
  item({
    id: "polo-featured-blog",
    from: P.polo,
    relationshipType: "FEATURED_IN",
    to: B.poloBlog,
    visibility: "PUBLIC",
    reason: "Published how-to blog for corporate polo selection",
    benchmarkTags: ["polo-corporate", "bank-uniform"],
  }),
  item({
    id: "polo-featured-guide",
    from: P.poloBasic,
    relationshipType: "FEATURED_IN",
    to: B.poloGuide,
    visibility: "PUBLIC",
    reason: "Published B2B polo sourcing guide",
    benchmarkTags: ["polo-corporate"],
  }),

  // --- Corporate gifts ---
  item({
    id: "tote-suitable-gift-customer",
    from: P.tote,
    relationshipType: "SUITABLE_FOR",
    to: V.giftCustomer,
    visibility: "PUBLIC",
    sourceEntryId: K.toteKb.sourceId,
    reason: "Tote is customer-gift use case SKU",
    benchmarkTags: ["corporate-gift"],
  }),
  item({
    id: "tote-targets-enterprise",
    from: P.tote,
    relationshipType: "TARGETS",
    to: V.enterprise,
    visibility: "PUBLIC",
    sourceEntryId: K.giftKb.sourceId,
    reason: "Enterprise gifting audience",
    benchmarkTags: ["corporate-gift"],
  }),
  item({
    id: "combo-suitable-gift-staff",
    from: P.giftCombo,
    relationshipType: "SUITABLE_FOR",
    to: V.giftStaff,
    visibility: "PUBLIC",
    sourceEntryId: K.giftKb.sourceId,
    reason: "Onboarding gift combo for employees",
    benchmarkTags: ["corporate-gift"],
  }),
  item({
    id: "combo-targets-enterprise",
    from: P.giftCombo,
    relationshipType: "TARGETS",
    to: V.enterprise,
    visibility: "PUBLIC",
    reason: "Enterprise audience for gift combos",
    benchmarkTags: ["corporate-gift"],
  }),
  item({
    id: "conf-suitable-gift-customer",
    from: P.giftConf,
    relationshipType: "SUITABLE_FOR",
    to: V.giftCustomer,
    visibility: "PUBLIC",
    reason: "Conference gift set for customers",
    benchmarkTags: ["corporate-gift"],
  }),
  item({
    id: "conf-featured-blog",
    from: P.giftConf,
    relationshipType: "FEATURED_IN",
    to: B.giftBlog,
    visibility: "PUBLIC",
    reason: "Published conference gift combo blog",
    benchmarkTags: ["corporate-gift"],
  }),
  item({
    id: "bottle-suitable-merch",
    from: P.bottle,
    relationshipType: "SUITABLE_FOR",
    to: V.merch,
    visibility: "PUBLIC",
    reason: "Bottle used as branded merchandise / gift",
    benchmarkTags: ["corporate-gift"],
    expectedRelevance: "MEDIUM",
  }),
  item({
    id: "tote-documented-kb",
    from: P.tote,
    relationshipType: "DOCUMENTED_BY",
    to: K.toteKb,
    visibility: "PUBLIC",
    sourceEntryId: K.toteKb.sourceId,
    reason: "Tote KB evidence",
    benchmarkTags: ["corporate-gift"],
  }),

  // --- Bulk tee / OEM / print ---
  item({
    id: "tee-has-capability-production",
    from: P.tee,
    relationshipType: "HAS_CAPABILITY",
    to: C.production,
    visibility: "PUBLIC",
    reason: "Bulk tee linked to production capability evidence",
    benchmarkTags: ["bulk-tee-factory", "oem-private-label", "screen-print-bulk"],
  }),
  item({
    id: "tee-has-capability-printing",
    from: P.tee,
    relationshipType: "HAS_CAPABILITY",
    to: C.printing,
    visibility: "PUBLIC",
    reason: "Bulk tee supports logo print capability",
    benchmarkTags: ["screen-print-bulk", "bulk-tee-factory"],
  }),
  item({
    id: "tee220-has-capability-qc",
    from: P.tee220,
    relationshipType: "HAS_CAPABILITY",
    to: C.qc,
    visibility: "PUBLIC",
    reason: "QC capability for bulk apparel",
    benchmarkTags: ["bulk-tee-factory"],
    expectedRelevance: "MEDIUM",
  }),
  item({
    id: "tee-export-has-capability-production",
    from: P.teeExport,
    relationshipType: "HAS_CAPABILITY",
    to: C.production,
    visibility: "PUBLIC",
    reason: "Export/OEM blank tee linked to production",
    benchmarkTags: ["oem-private-label", "bulk-tee-factory"],
  }),
  item({
    id: "tee-export-documented-oem",
    from: P.teeExport,
    relationshipType: "DOCUMENTED_BY",
    to: K.oemKb,
    visibility: "PUBLIC",
    sourceEntryId: K.oemKb.sourceId,
    reason: "OEM & private label KB documents export tee path",
    benchmarkTags: ["oem-private-label"],
  }),
  item({
    id: "tee-documented-moq",
    from: P.tee,
    relationshipType: "DOCUMENTED_BY",
    to: K.moqKb,
    visibility: "PUBLIC",
    sourceEntryId: K.moqKb.sourceId,
    reason: "MOQ KB relevant to bulk tee factory queries",
    benchmarkTags: ["bulk-tee-factory"],
  }),
  item({
    id: "capability-printing-suitable-corp",
    from: C.printing,
    relationshipType: "SUITABLE_FOR",
    to: V.corpUniform,
    visibility: "PUBLIC",
    reason: "Print capability applies to corporate uniform programs",
    benchmarkTags: ["screen-print-bulk", "polo-corporate"],
  }),
  item({
    id: "capability-production-targets-mfg",
    from: C.production,
    relationshipType: "TARGETS",
    to: V.manufacturing,
    visibility: "PUBLIC",
    reason: "Production capability serves manufacturing industry buyers",
    benchmarkTags: ["bulk-tee-factory"],
    expectedRelevance: "MEDIUM",
  }),
  item({
    id: "warehouse-featured-blog",
    from: C.warehouse,
    relationshipType: "FEATURED_IN",
    to: B.warehouseBlog,
    visibility: "PUBLIC",
    reason: "Warehouse capability featured in published sỉ blog",
    benchmarkTags: ["bulk-tee-factory"],
    expectedRelevance: "MEDIUM",
  }),

  // --- INTERNAL path fixture (visibility safety) ---
  item({
    id: "polo-documented-moq-policy-internal",
    from: P.polo,
    relationshipType: "DOCUMENTED_BY",
    to: K.moqPolicy,
    visibility: "INTERNAL",
    sourceEntryId: K.moqPolicy.sourceId,
    reason: "INTERNAL MOQ policy — must not leak on PUBLIC consumers",
    benchmarkTags: ["polo-corporate"],
    evaluationFixture: "INTERNAL_PATH",
    expectedRelevance: "LOW",
  }),
];

export const GRAPH_CURATION_MANIFEST_META = {
  version: GRAPH_CURATION_MANIFEST_VERSION,
  itemCount: GRAPH_CURATION_MANIFEST.length,
  skippedDueToMissingSource: [
    "SEO_TOPIC HAS_MEDIA MEDIA_BUNDLE — SeoTopic=0 MediaBundle=0",
    "SEO_TOPIC LINKS_TO BLOG_POST — SeoTopic=0",
    "BLOG_POST HAS_MEDIA MEDIA_BUNDLE — MediaBundle=0",
    "PRODUCT SUPPORTS PRINT_METHOD — PrintMethod=0",
    "CAPABILITY HAS_MEDIA MEDIA_BUNDLE — MediaBundle=0",
    "CAPABILITY EVIDENCED_BY CASE_STUDY — no CaseStudy entities",
  ],
};
