import type { ClusterType } from "@/features/blog/content-clusters-types";

export type { ClusterType } from "@/features/blog/content-clusters-types";

export type ClusterArticleType = "pillar" | "supporting";

export type ClusterPriority = "high" | "medium" | "low";

export interface ClusterArticle {
  id: string;
  title: string;
  keyword: string;
  type: ClusterArticleType;
  intent: string;
  priority: number;
  priorityLabel: ClusterPriority;
  suggestedLinks: string[];
}

export interface ContentCluster {
  topic: string;
  clusterType: ClusterType;
  pillar: ClusterArticle;
  supporting: ClusterArticle[];
}

export type InternalLinkEdge = {
  fromId: string;
  fromTitle: string;
  toId: string;
  toTitle: string;
};

export type InternalLinkMap = {
  edges: InternalLinkEdge[];
};

export type PublishWeek = {
  week: number;
  label: string;
  articles: ClusterArticle[];
};

export type PublishRoadmap = {
  weeks: PublishWeek[];
};

type SupportingTemplate = {
  title: string;
  keyword: string;
  intent: string;
  priority: number;
  extraLinks?: string[];
};

type ClusterTemplate = {
  type: ClusterType;
  topicLabel: string;
  pillarTitle: (keyword: string) => string;
  pillarKeyword: (keyword: string) => string;
  pillarIntent: string;
  supporting: SupportingTemplate[];
};

function priorityLabel(priority: number): ClusterPriority {
  if (priority <= 2) return "high";
  if (priority <= 6) return "medium";
  return "low";
}

function normalizeKeyword(keyword: string): string {
  return keyword.trim();
}

function capitalizeTopic(keyword: string): string {
  const trimmed = keyword.trim();
  if (!trimmed) return "Chủ đề B2B";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

const CLUSTER_TEMPLATES: ClusterTemplate[] = [
  {
    type: "source-supplier",
    topicLabel: "Nguồn hàng áo thun trơn",
    pillarTitle: (kw) => `${capitalizeTopic(kw)} Giá Sỉ: Hướng Dẫn Toàn Diện`,
    pillarKeyword: (kw) => normalizeKeyword(kw) || "nguồn hàng áo thun trơn",
    pillarIntent: "informational + commercial B2B",
    supporting: [
      { title: "Kho Áo Thun Trơn TPHCM", keyword: "kho áo thun trơn tphcm", intent: "local commercial", priority: 2 },
      { title: "Áo Thun Trơn Sỉ Cho Xưởng In", keyword: "áo thun trơn sỉ cho xưởng in", intent: "commercial B2B", priority: 2, extraLinks: ["support-2"] },
      { title: "So Sánh Nguồn Hàng Áo Thun Trơn", keyword: "so sánh nguồn hàng áo thun trơn", intent: "comparison", priority: 3 },
      { title: "OEM Áo Thun Trơn Là Gì", keyword: "OEM áo thun trơn", intent: "informational OEM", priority: 4 },
      { title: "Mở Đại Lý Áo Thun Trơn", keyword: "mở đại lý áo thun trơn", intent: "dealer recruitment", priority: 4 },
      { title: "Bảng Giá Áo Thun Trơn Sỉ", keyword: "bảng giá áo thun trơn sỉ", intent: "commercial pricing", priority: 3 },
      { title: "Nguồn Hàng Áo Thun Trơn Cho Agency", keyword: "nguồn hàng áo thun trơn cho agency", intent: "B2B agency", priority: 5 },
      { title: "Sai Lầm Khi Chọn Nhà Cung Cấp Áo Thun", keyword: "sai lầm chọn nhà cung cấp áo thun", intent: "informational", priority: 5 },
      { title: "Checklist Chọn Nguồn Hàng Áo Thun Trơn", keyword: "checklist chọn nguồn hàng áo thun trơn", intent: "informational checklist", priority: 3 },
      { title: "Xu Hướng Áo Thun Trơn 2026", keyword: "xu hướng áo thun trơn 2026", intent: "trend informational", priority: 6 },
      { title: "Cotton vs CVC: Chọn Vải Áo Thun Trơn Sỉ", keyword: "cotton vs cvc áo thun trơn", intent: "informational", priority: 6 },
      { title: "MOQ Áo Thun Trơn Sỉ Là Bao Nhiêu", keyword: "MOQ áo thun trơn sỉ", intent: "commercial FAQ", priority: 4 },
    ],
  },
  {
    type: "oem",
    topicLabel: "OEM áo polo",
    pillarTitle: (kw) => `${capitalizeTopic(kw)}: Quy Trình OEM Cho Doanh Nghiệp`,
    pillarKeyword: (kw) => normalizeKeyword(kw) || "OEM áo polo",
    pillarIntent: "commercial OEM",
    supporting: [
      { title: "OEM Là Gì? Khác Gì ODM và OBM", keyword: "OEM là gì", intent: "informational", priority: 2 },
      { title: "Quy Trình OEM Áo Polo Tại Việt Nam", keyword: "quy trình OEM áo polo", intent: "informational", priority: 2 },
      { title: "MOQ OEM Áo Thun và Polo", keyword: "MOQ OEM áo thun", intent: "commercial", priority: 3 },
      { title: "In Logo Áo Polo OEM", keyword: "in logo áo polo OEM", intent: "commercial", priority: 3, extraLinks: ["support-3"] },
      { title: "Private Label Áo Thun Trơn", keyword: "private label áo thun trơn", intent: "commercial", priority: 4 },
      { title: "Báo Giá OEM Áo Polo Doanh Nghiệp", keyword: "báo giá OEM áo polo", intent: "commercial pricing", priority: 3 },
      { title: "Chọn Xưởng OEM Áo Thun Uy Tín", keyword: "xưởng OEM áo thun uy tín", intent: "comparison", priority: 4 },
      { title: "Tem Mác và Care Label OEM", keyword: "tem mác OEM áo thun", intent: "informational", priority: 5 },
      { title: "Timeline Sản Xuất OEM 500 Chiếc", keyword: "timeline sản xuất OEM", intent: "informational", priority: 5 },
      { title: "OEM Áo Polo Cho Chuỗi F&B", keyword: "OEM áo polo F&B", intent: "case study", priority: 6 },
      { title: "OEM vs Mua Sẵn Áo Trơn Sỉ", keyword: "OEM vs áo trơn sỉ", intent: "comparison", priority: 5 },
      { title: "Xu Hướng OEM May Mặc 2026", keyword: "xu hướng OEM may mặc 2026", intent: "trend", priority: 7 },
    ],
  },
  {
    type: "dealer-recruitment",
    topicLabel: "Đại lý áo thun",
    pillarTitle: (kw) => `${capitalizeTopic(kw)}: Chính Sách và Cơ Hội Kinh Doanh`,
    pillarKeyword: (kw) => normalizeKeyword(kw) || "đại lý áo thun",
    pillarIntent: "dealer recruitment",
    supporting: [
      { title: "Chính Sách Đại Lý Áo Thun Trơn ATTD", keyword: "chính sách đại lý áo thun", intent: "commercial", priority: 2 },
      { title: "Làm Đại Lý Áo Thun Trơn Cần Bao Nhiêu Vốn", keyword: "vốn làm đại lý áo thun", intent: "informational", priority: 2 },
      { title: "MOQ Đại Lý Áo Thun Trơn Sỉ", keyword: "MOQ đại lý áo thun trơn", intent: "commercial", priority: 3 },
      { title: "Hỗ Trợ Marketing Cho Đại Lý Áo Thun", keyword: "hỗ trợ marketing đại lý áo thun", intent: "informational", priority: 4 },
      { title: "Kinh Doanh Áo Thun Trơn Sỉ Online", keyword: "kinh doanh áo thun trơn sỉ online", intent: "commercial", priority: 3 },
      { title: "Đại Lý Áo Thun Cho Xưởng In", keyword: "đại lý áo thun xưởng in", intent: "B2B", priority: 4, extraLinks: ["support-5"] },
      { title: "So Sánh Nguồn Hàng Đại Lý Áo Thun", keyword: "so sánh nguồn hàng đại lý", intent: "comparison", priority: 5 },
      { title: "Quy Trình Đăng Ký Đại Lý ATTD", keyword: "đăng ký đại lý ATTD", intent: "navigational", priority: 3 },
      { title: "Chiết Khấu Đại Lý Áo Thun Trơn", keyword: "chiết khấu đại lý áo thun", intent: "commercial", priority: 4 },
      { title: "Sai Lầm Đại Lý Mới Mở Shop Áo Thun", keyword: "sai lầm đại lý áo thun", intent: "informational", priority: 6 },
      { title: "Case Study Đại Lý Áo Thun Thành Công", keyword: "case study đại lý áo thun", intent: "case study", priority: 6 },
      { title: "Mở Rộng Từ Sỉ Sang OEM và Quà Tặng", keyword: "đại lý mở rộng OEM quà tặng", intent: "commercial upsell", priority: 7 },
    ],
  },
  {
    type: "corporate-uniform",
    topicLabel: "Đồng phục công ty",
    pillarTitle: (kw) => `${capitalizeTopic(kw)}: Hướng Dẫn Chọn và Sản Xuất`,
    pillarKeyword: (kw) => normalizeKeyword(kw) || "đồng phục công ty",
    pillarIntent: "commercial corporate uniform",
    supporting: [
      { title: "Áo Thun Đồng Phục Công Ty", keyword: "áo thun đồng phục công ty", intent: "commercial", priority: 2 },
      { title: "Polo Đồng Phục Nhân Viên", keyword: "polo đồng phục nhân viên", intent: "commercial", priority: 2 },
      { title: "Size Guide Đồng Phục Công Ty", keyword: "size guide đồng phục công ty", intent: "informational", priority: 3 },
      { title: "In Logo Đồng Phục Doanh Nghiệp", keyword: "in logo đồng phục doanh nghiệp", intent: "commercial", priority: 3 },
      { title: "Báo Giá Đồng Phục Công Ty 100 Nhân Viên", keyword: "báo giá đồng phục công ty", intent: "commercial pricing", priority: 3 },
      { title: "Đồng Phục Team Building", keyword: "đồng phục team building", intent: "commercial", priority: 4, extraLinks: ["support-2"] },
      { title: "Chọn Vải Đồng Phục Cotton vs CVC", keyword: "vải đồng phục cotton CVC", intent: "informational", priority: 4 },
      { title: "Quy Trình Sản Xuất Đồng Phục", keyword: "quy trình sản xuất đồng phục", intent: "informational", priority: 5 },
      { title: "Đồng Phục Công Ty Cho Startup", keyword: "đồng phục startup", intent: "commercial", priority: 5 },
      { title: "Đồng Phục F&B và Nhà Hàng", keyword: "đồng phục F&B", intent: "vertical", priority: 6 },
      { title: "Onboarding Nhân Viên với Áo Thun Brand", keyword: "áo thun onboarding nhân viên", intent: "HR use case", priority: 6 },
      { title: "Xu Hướng Đồng Phục Doanh Nghiệp 2026", keyword: "xu hướng đồng phục 2026", intent: "trend", priority: 7 },
    ],
  },
  {
    type: "corporate-gift",
    topicLabel: "Quà tặng doanh nghiệp",
    pillarTitle: (kw) => `${capitalizeTopic(kw)}: Gợi Ý và Quy Trình Triển Khai`,
    pillarKeyword: (kw) => normalizeKeyword(kw) || "quà tặng doanh nghiệp",
    pillarIntent: "commercial corporate gift",
    supporting: [
      { title: "Quà Tặng Áo Thun In Logo Doanh Nghiệp", keyword: "quà tặng áo thun in logo", intent: "commercial", priority: 2 },
      { title: "Set Quà Tết Doanh Nghiệp", keyword: "set quà tết doanh nghiệp", intent: "commercial seasonal", priority: 2 },
      { title: "Quà Tặng Khách Hàng B2B", keyword: "quà tặng khách hàng B2B", intent: "commercial", priority: 3 },
      { title: "MOQ Quà Tặng Doanh Nghiệp", keyword: "MOQ quà tặng doanh nghiệp", intent: "commercial", priority: 3 },
      { title: "Đóng Gói Quà Tặng Doanh Nghiệp", keyword: "đóng gói quà tặng doanh nghiệp", intent: "informational", priority: 4 },
      { title: "Quà Tặng Event và Hội Thảo", keyword: "quà tặng event doanh nghiệp", intent: "commercial", priority: 4, extraLinks: ["support-3"] },
      { title: "Combo Áo Thun và Túi Tote In Logo", keyword: "combo áo thun túi tote", intent: "commercial", priority: 5 },
      { title: "Báo Giá Quà Tặng Doanh Nghiệp", keyword: "báo giá quà tặng doanh nghiệp", intent: "commercial pricing", priority: 3 },
      { title: "Quà Tặng Year-End Doanh Nghiệp", keyword: "quà tặng year-end", intent: "seasonal", priority: 5 },
      { title: "Quà Tặng Onboarding Nhân Viên", keyword: "quà tặng onboarding", intent: "HR use case", priority: 6 },
      { title: "Case Study Quà Tặng Doanh Nghiệp", keyword: "case study quà tặng doanh nghiệp", intent: "case study", priority: 6 },
      { title: "Xu Hướng Quà Tặng B2B 2026", keyword: "xu hướng quà tặng B2B 2026", intent: "trend", priority: 7 },
    ],
  },
];

export const CLUSTER_EXAMPLES: { type: ClusterType; keyword: string; label: string }[] = [
  { type: "source-supplier", keyword: "Nguồn hàng áo thun trơn", label: "Nguồn hàng áo thun trơn" },
  { type: "oem", keyword: "OEM áo polo", label: "OEM áo polo" },
  { type: "dealer-recruitment", keyword: "Đại lý áo thun", label: "Đại lý áo thun" },
  { type: "corporate-uniform", keyword: "Đồng phục công ty", label: "Đồng phục công ty" },
  { type: "corporate-gift", keyword: "Quà tặng doanh nghiệp", label: "Quà tặng doanh nghiệp" },
];

export function resolveClusterType(keyword: string, explicit?: ClusterType): ClusterType {
  if (explicit) return explicit;
  const normalized = keyword.toLowerCase();
  if (normalized.includes("oem") || normalized.includes("private label")) return "oem";
  if (normalized.includes("quà tặng") || normalized.includes("qua tang")) return "corporate-gift";
  if (normalized.includes("đồng phục") || normalized.includes("dong phuc")) return "corporate-uniform";
  if (normalized.includes("đại lý") || normalized.includes("dai ly")) return "dealer-recruitment";
  return "source-supplier";
}

function getTemplate(type: ClusterType): ClusterTemplate {
  return CLUSTER_TEMPLATES.find((t) => t.type === type) ?? CLUSTER_TEMPLATES[0];
}

export function generateCluster(keyword: string, clusterType?: ClusterType): ContentCluster {
  const normalized = normalizeKeyword(keyword);
  const type = resolveClusterType(normalized, clusterType);
  const template = getTemplate(type);

  const pillar: ClusterArticle = {
    id: "pillar",
    title: template.pillarTitle(normalized),
    keyword: template.pillarKeyword(normalized),
    type: "pillar",
    intent: template.pillarIntent,
    priority: 1,
    priorityLabel: "high",
    suggestedLinks: [],
  };

  const supporting = template.supporting.map((item, index) => {
    const id = `support-${index + 1}`;
    const suggestedLinks = ["pillar", ...(item.extraLinks ?? [])];
    return {
      id,
      title: item.title,
      keyword: item.keyword,
      type: "supporting" as const,
      intent: item.intent,
      priority: item.priority,
      priorityLabel: priorityLabel(item.priority),
      suggestedLinks,
    };
  });

  return {
    topic: normalized || template.topicLabel,
    clusterType: type,
    pillar,
    supporting,
  };
}

export function getAllClusterArticles(cluster: ContentCluster): ClusterArticle[] {
  return [cluster.pillar, ...cluster.supporting];
}

function findArticle(cluster: ContentCluster, id: string): ClusterArticle | undefined {
  return getAllClusterArticles(cluster).find((a) => a.id === id);
}

export function generateInternalLinkMap(cluster: ContentCluster): InternalLinkMap {
  const edges: InternalLinkEdge[] = [];

  for (const article of cluster.supporting) {
    for (const targetId of article.suggestedLinks) {
      const target = findArticle(cluster, targetId);
      if (!target) continue;
      edges.push({
        fromId: article.id,
        fromTitle: article.title,
        toId: target.id,
        toTitle: target.title,
      });
    }
  }

  return { edges };
}

export function generatePublishOrder(cluster: ContentCluster): PublishRoadmap {
  const sorted = [...cluster.supporting].sort((a, b) => a.priority - b.priority);
  const weeks: PublishWeek[] = [
    { week: 1, label: "Tuần 1", articles: [cluster.pillar] },
  ];

  let weekIndex = 2;
  for (let i = 0; i < sorted.length; i += 2) {
    weeks.push({
      week: weekIndex,
      label: `Tuần ${weekIndex}`,
      articles: sorted.slice(i, i + 2),
    });
    weekIndex += 1;
  }

  return { weeks };
}

export function getClusterTypeLabel(type: ClusterType): string {
  return getTemplate(type).topicLabel;
}
