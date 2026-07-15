/**
 * Sprint 12.2 evaluation cohort — validated production source IDs / stable codes.
 * Version bump when cohort membership changes.
 */

export const GRAPH_EVALUATION_COHORT_VERSION = "12.3.0";

export type CohortRef = {
  sourceType: string;
  sourceId: string;
  label: string;
  role: string;
};

export const GRAPH_EVALUATION_COHORT = {
  version: GRAPH_EVALUATION_COHORT_VERSION,
  products: [
    { sourceType: "Product", sourceId: "cmqb62481001trwodp6exjpxy", label: "Áo Polo Đồng Phục", role: "polo-corporate" },
    { sourceType: "Product", sourceId: "cmqb624ab001xrwodj6tuht2s", label: "Áo Polo Trơn Basic", role: "polo-basic" },
    { sourceType: "Product", sourceId: "cmqb62411001hrwod85mtbv25", label: "Áo Polo Premium", role: "polo-premium" },
    { sourceType: "Product", sourceId: "cmqb6245p001prwodvc1zgv75", label: "Áo Polo Coolmax", role: "polo-coolmax" },
    { sourceType: "Product", sourceId: "cmqb623ym001drwod2kvldyfz", label: "Áo Polo CVC", role: "polo-cvc" },
    { sourceType: "Product", sourceId: "cmqb6232q0001rwod8xocy48r", label: "Áo thun Cotton 180gsm", role: "tee-bulk" },
    { sourceType: "Product", sourceId: "cmqb6238h0005rwod5zedrfh4", label: "Áo thun Cotton 220gsm", role: "tee-bulk-2" },
    { sourceType: "Product", sourceId: "cmqb623da000drwod1oc8id0y", label: "Áo thun CVC 65/35", role: "tee-cvc" },
    { sourceType: "Product", sourceId: "cmqb623rm0011rwoduuf3rybo", label: "Áo thun Blank Export", role: "tee-oem" },
    { sourceType: "Product", sourceId: "cmqfmckvs002bk0041n8hbx2u", label: "Tote canvas Basic", role: "gift-tote" },
    { sourceType: "Product", sourceId: "cmqfmcmvp002nk004u3nodsar", label: "Bình giữ nhiệt Inox 500ml", role: "gift-bottle" },
    { sourceType: "Product", sourceId: "cmqfmcqjk0039k004acvbp83s", label: "Combo gift set onboarding", role: "gift-combo" },
    { sourceType: "Product", sourceId: "cmqfmcrph003fk0044ki1ihbr", label: "Combo quà tặng hội nghị", role: "gift-conference" },
  ] as CohortRef[],

  capabilities: [
    { sourceType: "ManufacturingAsset", sourceId: "cmr7955oa0001rwf26n0eqm7w", label: "Minh chứng sản xuất", role: "production" },
    { sourceType: "ManufacturingAsset", sourceId: "cmr795734000hrwf22f6i3ph0", label: "Quy trình in logo", role: "printing" },
    { sourceType: "ManufacturingAsset", sourceId: "cmr7956820005rwf22ivuohfo", label: "Kiểm tra chất lượng", role: "qc" },
    { sourceType: "ManufacturingAsset", sourceId: "cmr7956sv000drwf2dyyhs5u4", label: "Kho hàng ATTD", role: "warehouse" },
    { sourceType: "ManufacturingAsset", sourceId: "cmr7957d9000lrwf2p9ljlu8l", label: "Bàn giao và giao hàng", role: "delivery" },
  ] as CohortRef[],

  useCases: [
    { sourceType: "MediaVocabularyTerm", sourceId: "mvt_use_case_dong_phuc_cong_ty", label: "Đồng phục công ty", role: "corp-uniform" },
    { sourceType: "MediaVocabularyTerm", sourceId: "mvt_use_case_qua_tang_khach_hang", label: "Quà tặng khách hàng", role: "gift-customer" },
    { sourceType: "MediaVocabularyTerm", sourceId: "mvt_use_case_qua_tang_nhan_vien", label: "Quà tặng nhân viên", role: "gift-staff" },
    { sourceType: "MediaVocabularyTerm", sourceId: "mvt_use_case_dong_phuc_su_kien", label: "Đồng phục sự kiện", role: "event-uniform" },
    { sourceType: "MediaVocabularyTerm", sourceId: "mvt_use_case_merchandise", label: "Merchandise", role: "merch" },
  ] as CohortRef[],

  audiences: [
    { sourceType: "MediaVocabularyTerm", sourceId: "mvt_audience_doanh_nghiep", label: "Doanh nghiệp", role: "enterprise" },
    { sourceType: "MediaVocabularyTerm", sourceId: "mvt_audience_nhan_vien", label: "Nhân viên", role: "employees" },
    { sourceType: "MediaVocabularyTerm", sourceId: "mvt_audience_dai_ly", label: "Đại lý", role: "dealer" },
  ] as CohortRef[],

  industries: [
    { sourceType: "MediaVocabularyTerm", sourceId: "mvt_industry_ngan_hang", label: "Ngân hàng", role: "banking" },
    { sourceType: "MediaVocabularyTerm", sourceId: "mvt_industry_doanh_nghiep", label: "Doanh nghiệp", role: "enterprise-industry" },
    { sourceType: "MediaVocabularyTerm", sourceId: "mvt_industry_san_xuat", label: "Sản xuất", role: "manufacturing" },
    { sourceType: "MediaVocabularyTerm", sourceId: "mvt_industry_su_kien", label: "Sự kiện", role: "events" },
  ] as CohortRef[],

  knowledgeEntries: [
    { sourceType: "KnowledgeBaseEntry", sourceId: "cmqewjysi000fkz04jpj2wprf", label: "Nhóm sản phẩm: Áo polo", role: "polo-kb" },
    { sourceType: "KnowledgeBaseEntry", sourceId: "cmqfhl8k4000fl704qmz9pwws", label: "Nguồn hàng áo polo trơn sỉ", role: "polo-si" },
    { sourceType: "KnowledgeBaseEntry", sourceId: "cmqfhlew8000pl70420xcnma4", label: "Quà tặng doanh nghiệp combo", role: "gift-kb" },
    { sourceType: "KnowledgeBaseEntry", sourceId: "cmqfhlc98000ll7046uycjtld", label: "Tote bag sỉ", role: "tote-kb" },
    { sourceType: "KnowledgeBaseEntry", sourceId: "cmqfhlhcx000tl704d30ai8qf", label: "OEM & Private Label", role: "oem-kb" },
    { sourceType: "KnowledgeBaseEntry", sourceId: "cmqfhll1x000zl704p8xldt92", label: "MOQ tối thiểu", role: "moq-kb" },
    { sourceType: "KnowledgeBaseEntry", sourceId: "cmqfmd612004fk0042poahscs", label: "Chính sách MOQ sỉ", role: "moq-policy" },
  ] as CohortRef[],

  blogs: [
    { sourceType: "BlogPost", sourceId: "cmqfmcxpe003yk004ck91s7al", label: "Combo quà tặng hội nghị", role: "gift-blog" },
    { sourceType: "BlogPost", sourceId: "cmqfmcy7e003zk004r693fi4x", label: "Cách chọn áo polo đồng phục", role: "polo-blog" },
    { sourceType: "BlogPost", sourceId: "cmqe2e7pt0000la04wauw7lj6", label: "Nguồn hàng áo thun polo B2B", role: "polo-guide" },
    { sourceType: "BlogPost", sourceId: "cmqfmcvv7003vk004b5gycw4v", label: "Kho sỉ đồng phục là gì", role: "warehouse-blog" },
  ] as CohortRef[],

  /** Production currently has zero SeoTopic / MediaBundle rows — tracked explicitly. */
  seoTopics: [] as CohortRef[],
  mediaBundles: [] as CohortRef[],
  dataGaps: [
    "SeoTopic count = 0 — SEO_TOPIC HAS_MEDIA / LINKS_TO paths cannot be curated from production.",
    "MediaBundle count = 0 — CAPABILITY HAS_MEDIA / Bundle discovery paths blocked.",
    "PrintMethod count = 0 — PRODUCT SUPPORTS PRINT_METHOD paths blocked.",
  ],
} as const;

export function listCohortSourceIds(sourceType: string): string[] {
  const bags = [
    ...GRAPH_EVALUATION_COHORT.products,
    ...GRAPH_EVALUATION_COHORT.capabilities,
    ...GRAPH_EVALUATION_COHORT.useCases,
    ...GRAPH_EVALUATION_COHORT.audiences,
    ...GRAPH_EVALUATION_COHORT.industries,
    ...GRAPH_EVALUATION_COHORT.knowledgeEntries,
    ...GRAPH_EVALUATION_COHORT.blogs,
    ...GRAPH_EVALUATION_COHORT.seoTopics,
    ...GRAPH_EVALUATION_COHORT.mediaBundles,
  ];
  return bags.filter((r) => r.sourceType === sourceType).map((r) => r.sourceId);
}
