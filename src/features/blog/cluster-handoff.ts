import type { BusinessGoal } from "@/features/blog/ai-factory-types";
import type { ContentBlueprintId } from "@/features/blog/content-blueprints";
import type { ClusterType } from "@/features/blog/content-clusters-types";

export type ClusterHandoffRequest = {
  keyword: string;
  businessGoal: BusinessGoal;
  blueprintId: ContentBlueprintId;
  autoGenerate: boolean;
};

export const CLUSTER_TYPE_META: Record<
  ClusterType,
  {
    label: string;
    exampleKeyword: string;
    businessGoal: BusinessGoal;
    blueprintId: ContentBlueprintId;
  }
> = {
  "source-supplier": {
    label: "Nguồn hàng",
    exampleKeyword: "Nguồn hàng áo thun trơn",
    businessGoal: "seo-traffic",
    blueprintId: "source-supplier",
  },
  oem: {
    label: "OEM",
    exampleKeyword: "OEM áo polo",
    businessGoal: "oem-leads",
    blueprintId: "oem",
  },
  "dealer-recruitment": {
    label: "Đại lý",
    exampleKeyword: "Đại lý áo thun",
    businessGoal: "dealer-recruitment",
    blueprintId: "dealer-recruitment",
  },
  "corporate-uniform": {
    label: "Đồng phục",
    exampleKeyword: "Đồng phục công ty",
    businessGoal: "corporate-uniform",
    blueprintId: "corporate-uniform",
  },
  "corporate-gift": {
    label: "Quà tặng doanh nghiệp",
    exampleKeyword: "Quà tặng doanh nghiệp",
    businessGoal: "corporate-gift",
    blueprintId: "corporate-gift",
  },
};

export function clusterArticleToHandoff(
  article: { keyword: string },
  clusterType: ClusterType
): ClusterHandoffRequest {
  const meta = CLUSTER_TYPE_META[clusterType];
  return {
    keyword: article.keyword,
    businessGoal: meta.businessGoal,
    blueprintId: meta.blueprintId,
    autoGenerate: true,
  };
}
