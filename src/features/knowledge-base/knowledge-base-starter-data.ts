import type { KnowledgeBaseEntryType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createKnowledgeBaseEntry,
  ensureDefaultKnowledgeCategories,
  getCategoryIdBySlug,
} from "@/features/knowledge-base/knowledge-base-seed";
import { generateKnowledgeBaseSlug } from "@/features/knowledge-base/knowledge-base-utils";

type StarterEntry = {
  title: string;
  summary: string;
  content: string;
  categorySlug: string;
  type: KnowledgeBaseEntryType;
  usageScope: string[];
  tags: string[];
  structuredData?: Record<string, unknown>;
  priority?: "HIGH" | "MEDIUM" | "LOW";
};

const STARTER_ENTRIES: StarterEntry[] = [
  {
    title: "ATTD — Tổng quan thương hiệu",
    summary:
      "ATTD là nền tảng B2B may mặc và quà tặng doanh nghiệp tại Việt Nam, phục vụ đại lý, xưởng in, OEM và khách hàng doanh nghiệp.",
    content:
      "ATTD (attd.vn) định vị là nền tảng B2B cho nguồn hàng áo thun, đồng phục, phụ kiện và quà tặng doanh nghiệp. Thương hiệu hướng tới trải nghiệm hiện đại, chuyên nghiệp, minh bạch quy trình và hỗ trợ đối tác B2B dài hạn.",
    categorySlug: "company",
    type: "COMPANY",
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "SEO_PLANNING"],
    tags: ["ATTD", "B2B", "brand"],
    priority: "HIGH",
  },
  {
    title: "Thương hiệu legacy: Áo Thun Thông Điệp",
    summary:
      "ATTD kế thừa kinh nghiệm vận hành từ thương hiệu Áo Thun Thông Điệp (aothunthongdiep.com).",
    content:
      "Áo Thun Thông Điệp là thương hiệu legacy trong hệ sinh thái ATTD, tập trung nguồn hàng áo thun và kinh nghiệm phục vụ khách B2B. ATTD.vn là nền tảng hiện đại hóa trải nghiệm sourcing, OEM và quà tặng doanh nghiệp.",
    categorySlug: "company",
    type: "COMPANY",
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI"],
    tags: ["legacy", "aothunthongdiep"],
  },
  {
    title: "Nhóm sản phẩm: Áo thun trơn",
    summary: "Áo thun trơn phục vụ bán sỉ, xưởng in, đại lý và đồng phục cơ bản.",
    content:
      "Áo thun trơn là nhóm sản phẩm lõi của ATTD, phù hợp bán sỉ, in logo, làm đồng phục và quà tặng doanh nghiệp. Cần bổ sung chi tiết chất liệu, size curve và MOQ theo từng dòng hàng.",
    categorySlug: "products-materials",
    type: "PRODUCT",
    usageScope: ["BLOG_AI", "PRODUCT_AI", "SEO_PLANNING"],
    tags: ["áo thun trơn", "nguồn hàng"],
    structuredData: {
      useCases: ["In áo theo yêu cầu", "Đồng phục", "Bán sỉ"],
      note: "Chi tiết MOQ và chất liệu cần xác minh",
    },
  },
  {
    title: "Nhóm sản phẩm: Áo polo",
    summary: "Áo polo phục vụ đồng phục doanh nghiệp, F&B, retail và OEM.",
    content:
      "Áo polo là nhóm sản phẩm phù hợp đồng phục doanh nghiệp, nhân viên cửa hàng và OEM in/thêu logo. ATTD hỗ trợ tư vấn form, chất liệu và quy trình sản xuất theo yêu cầu.",
    categorySlug: "products-materials",
    type: "PRODUCT",
    usageScope: ["BLOG_AI", "PRODUCT_AI", "SEO_PLANNING"],
    tags: ["polo", "đồng phục"],
    structuredData: { useCases: ["Đồng phục công ty", "OEM", "Quà tặng doanh nghiệp"] },
  },
  {
    title: "Nhóm sản phẩm: Bandana",
    summary: "Bandana dùng cho event, team building, quà tặng và combo thương hiệu.",
    categorySlug: "products-materials",
    type: "PRODUCT",
    usageScope: ["BLOG_AI", "PRODUCT_AI"],
    tags: ["bandana", "phụ kiện"],
    content: "Bandana là phụ kiện linh hoạt cho event, F&B, team building và combo quà tặng in logo.",
  },
  {
    title: "Nhóm sản phẩm: Nón đồng phục",
    summary: "Nón đồng phục phục vụ F&B, event, bán lẻ và combo quà tặng.",
    categorySlug: "products-materials",
    type: "PRODUCT",
    usageScope: ["BLOG_AI", "PRODUCT_AI"],
    tags: ["nón", "đồng phục"],
    content: "Nón đồng phục phù hợp nhà hàng, event, team building và combo quà tặng doanh nghiệp.",
  },
  {
    title: "Nhóm sản phẩm: Quà tặng doanh nghiệp",
    summary: "Combo quà tặng B2B gồm áo thun, phụ kiện và đóng gói theo thương hiệu.",
    categorySlug: "products-materials",
    type: "PRODUCT",
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "SEO_PLANNING"],
    tags: ["quà tặng", "corporate gift"],
    content:
      "ATTD hỗ trợ combo quà tặng doanh nghiệp: áo thun in logo, phụ kiện, túi tote và đóng gói theo brief thương hiệu.",
  },
  {
    title: "Dịch vụ OEM — Tổng quan",
    summary: "ATTD hỗ trợ OEM, private label và sản xuất theo yêu cầu doanh nghiệp.",
    categorySlug: "manufacturing-oem",
    type: "OEM",
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "SEO_PLANNING"],
    tags: ["OEM", "private label"],
    content:
      "ATTD hỗ trợ OEM cho doanh nghiệp và đại lý: may, in, thêu, tem mác và đóng gói theo yêu cầu. MOQ và lead time phụ thuộc sản phẩm — cần xác minh trước khi dùng số liệu cụ thể.",
    structuredData: {
      services: ["May", "In", "Thêu", "Đóng gói"],
      moq: "Tùy sản phẩm — cần xác minh",
      leadTime: "Theo số lượng và yêu cầu — cần xác minh",
    },
    priority: "HIGH",
  },
  {
    title: "Bán sỉ & chính sách đại lý — Tổng quan",
    summary: "ATTD phục vụ đại lý, xưởng in và nguồn hàng B2B trên toàn quốc.",
    categorySlug: "wholesale-dealer",
    type: "DEALER",
    usageScope: ["BLOG_AI", "SEO_PLANNING", "SALES", "DEALER_PORTAL"],
    tags: ["đại lý", "bán sỉ", "nguồn hàng"],
    content:
      "ATTD hỗ trợ đại lý và khách bán sỉ với nguồn hàng áo trơn, chính sách hợp tác và tư vấn mở rộng sang OEM/quà tặng. Chi tiết chiết khấu và MOQ cần xác minh trước khi publish.",
    priority: "HIGH",
  },
  {
    title: "Giao hàng toàn quốc",
    summary: "ATTD hỗ trợ giao hàng cho khách hàng B2B trên phạm vi toàn quốc.",
    categorySlug: "policies-processes",
    type: "LOGISTICS",
    usageScope: ["BLOG_AI", "CRM", "SALES"],
    tags: ["giao hàng", "logistics"],
    content:
      "ATTD hỗ trợ giao hàng toàn quốc cho đơn hàng bán sỉ, OEM và quà tặng doanh nghiệp. Timeline cụ thể phụ thuộc khu vực và quy mô đơn — cần xác minh.",
  },
  {
    title: "Brand voice ATTD",
    summary: "Giọng thương hiệu hiện đại, chuyên nghiệp, rõ ràng — hướng premium B2B.",
    categorySlug: "brand-seo",
    type: "BRAND_VOICE",
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "PRODUCT_AI"],
    tags: ["brand voice", "tone"],
    content:
      "Giọng ATTD: chuyên nghiệp, rõ ràng, tập trung giá trị B2B. Tránh hype rẻ tiền. Ưu tiên minh bạch quy trình, năng lực thực tế và hỗ trợ đối tác. Phong cách tham chiếu: hiện đại, premium (Apple/Nike-inspired) nhưng phù hợp thị trường Việt Nam.",
    priority: "HIGH",
  },
  {
    title: "SEO priority clusters",
    summary:
      "Cụm chủ đề SEO ưu tiên: nguồn hàng áo thun trơn, OEM áo polo, đại lý, đồng phục, quà tặng doanh nghiệp.",
    categorySlug: "brand-seo",
    type: "SEO_CONTEXT",
    usageScope: ["BLOG_AI", "SEO_PLANNING"],
    tags: ["SEO", "cluster"],
    content:
      "Các cụm SEO ưu tiên của ATTD:\n- Nguồn hàng áo thun trơn\n- OEM áo polo\n- Đại lý áo thun\n- Đồng phục công ty\n- Quà tặng doanh nghiệp\n\nMỗi cụm cần pillar + supporting articles và internal link về pillar.",
    structuredData: {
      clusters: [
        "Nguồn hàng áo thun trơn",
        "OEM áo polo",
        "Đại lý áo thun",
        "Đồng phục công ty",
        "Quà tặng doanh nghiệp",
      ],
    },
    priority: "HIGH",
  },
];

export async function importKnowledgeBaseStarterData(): Promise<{ created: number; skipped: number }> {
  await ensureDefaultKnowledgeCategories();

  let created = 0;
  let skipped = 0;

  for (const item of STARTER_ENTRIES) {
    const categoryId = await getCategoryIdBySlug(item.categorySlug);
    if (!categoryId) continue;

    const slug = generateKnowledgeBaseSlug(item.title);
    const existing = await prisma.knowledgeBaseEntry.findUnique({ where: { slug } });
    if (existing) {
      skipped += 1;
      continue;
    }

    await createKnowledgeBaseEntry({
      title: item.title,
      slug,
      summary: item.summary,
      content: item.content,
      categoryId,
      type: item.type,
      status: "DRAFT",
      priority: item.priority ?? "MEDIUM",
      tags: item.tags,
      usageScope: item.usageScope,
      structuredData: (item.structuredData ?? undefined) as Prisma.InputJsonValue | undefined,
      isVerified: false,
      isFeatured: item.priority === "HIGH",
    });
    created += 1;
  }

  return { created, skipped };
}
