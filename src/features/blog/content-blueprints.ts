import { CTA_BLOCK_SNIPPET } from "@/features/blog/seo-blocks";
import type { BlogFaqItem } from "@/features/blog/types";

export type ContentBlueprintId =
  | "source-supplier"
  | "oem"
  | "dealer-recruitment"
  | "corporate-uniform"
  | "corporate-gift";

export type ContentBlueprint = {
  id: ContentBlueprintId;
  label: string;
  exampleKeyword: string;
  audienceOption: "b2b-dealer" | "oem" | "corporate-uniform" | "corporate-gift";
  structure: string[];
  h3Sections: { parentH2Index: number; title: string }[];
  suggestedFaqs: BlogFaqItem[];
  suggestedCta: string;
  suggestedTags: string[];
  internalLinkKeywords: string[];
  categoryHints: string[];
  ctaUrl: string;
};

export const CONTENT_BLUEPRINTS: ContentBlueprint[] = [
  {
    id: "source-supplier",
    label: "Source Supplier Article",
    exampleKeyword: "Nguồn hàng áo thun trơn",
    audienceOption: "b2b-dealer",
    structure: [
      "Giới thiệu",
      "Vì sao nên chọn nguồn hàng có kho thực tế",
      "Tiêu chí đánh giá chất liệu và form áo",
      "Chính sách giá sỉ và MOQ",
      "Quy trình báo giá và giao hàng",
      "Case study đại lý và xưởng in",
      "Checklist chọn nhà cung cấp uy tín",
      "Kết luận",
    ],
    h3Sections: [
      { parentH2Index: 2, title: "Cotton, CVC và TC — chọn vải phù hợp" },
      { parentH2Index: 3, title: "Bảng MOQ theo từng nhóm khách hàng" },
      { parentH2Index: 5, title: "Quy trình onboarding đại lý mới" },
    ],
    suggestedFaqs: [
      {
        question: "MOQ tối thiểu khi lấy nguồn hàng áo thun trơn là bao nhiêu?",
        answer:
          "MOQ phụ thuộc màu/size và chính sách đại lý. Shop mới thường bắt đầu từ 20–50 chiếc/màu; đại lý có cam kết doanh số được ưu đãi giá và giữ hàng.",
      },
      {
        question: "Làm sao kiểm tra nhà cung cấp có kho thực tế?",
        answer:
          "Yêu cầu bảng tồn kho cập nhật, video/ảnh kho, lịch nhập container và chính sách giữ hàng. Đặt mẫu thử trước khi chốt đơn lớn.",
      },
      {
        question: "ATTD có hỗ trợ báo giá nhanh cho đại lý không?",
        answer:
          "Có. Team sales ATTD hỗ trợ báo giá theo màu, size, số lượng và giao hàng toàn quốc trong 24–72 giờ với mã sẵn kho.",
      },
    ],
    suggestedCta: `:::cta
title: Nhận báo giá nguồn hàng áo thun trơn
button: Liên hệ ATTD
url: /nguon-hang-ao-thun-tron
:::`,
    suggestedTags: [
      "nguồn hàng áo thun trơn",
      "áo thun trơn sỉ",
      "B2B",
      "đại lý",
      "kho áo thun trơn",
    ],
    internalLinkKeywords: [
      "nguồn hàng áo thun trơn",
      "áo thun trơn sỉ",
      "kho áo thun trơn",
      "đại lý",
    ],
    categoryHints: ["nguồn hàng", "b2b", "sỉ"],
    ctaUrl: "/nguon-hang-ao-thun-tron",
  },
  {
    id: "oem",
    label: "OEM Article",
    exampleKeyword: "OEM áo polo",
    audienceOption: "oem",
    structure: [
      "OEM là gì và khác gì ODM",
      "Lợi ích OEM cho thương hiệu doanh nghiệp",
      "Quy trình OEM tại ATTD",
      "Tiêu chí chọn xưởng OEM uy tín",
      "Báo giá OEM và yếu tố ảnh hưởng giá",
      "In logo, tem mác và private label",
      "Case study OEM doanh nghiệp",
      "Kết luận",
    ],
    h3Sections: [
      { parentH2Index: 2, title: "Tư vấn → mẫu → sản xuất → giao hàng" },
      { parentH2Index: 4, title: "MOQ và timeline sản xuất OEM" },
      { parentH2Index: 5, title: "In lụa vs chuyển nhiệt vs thêu logo" },
    ],
    suggestedFaqs: [
      {
        question: "ATTD có nhận OEM áo polo và áo thun theo yêu cầu không?",
        answer:
          "Có. ATTD hỗ trợ OEM từ tư vấn chất liệu, duyệt mẫu, sản xuất hàng loạt đến giao hàng với timeline thỏa thuận.",
      },
      {
        question: "MOQ OEM thường là bao nhiêu?",
        answer:
          "MOQ OEM phụ thuộc form áo, màu vải và công in/thêu. Dự án doanh nghiệp thường từ 300–500 chiếc trở lên; liên hệ để nhận báo giá cụ thể.",
      },
      {
        question: "Quy trình duyệt mẫu OEM mất bao lâu?",
        answer:
          "Thông thường 5–10 ngày làm việc cho pre-production sample sau khi chốt artwork và chất liệu.",
      },
    ],
    suggestedCta: `:::cta
title: Nhận báo giá OEM
button: Liên hệ ATTD
url: /oem
:::`,
    suggestedTags: ["OEM", "private label", "áo polo", "in logo", "doanh nghiệp"],
    internalLinkKeywords: ["OEM", "áo thun trơn sỉ", "quà tặng doanh nghiệp"],
    categoryHints: ["oem", "sản xuất"],
    ctaUrl: "/oem",
  },
  {
    id: "dealer-recruitment",
    label: "Dealer Recruitment",
    exampleKeyword: "Đại lý áo thun",
    audienceOption: "b2b-dealer",
    structure: [
      "Cơ hội kinh doanh áo thun trơn sỉ",
      "Quyền lợi khi trở thành đại lý ATTD",
      "Điều kiện và quy trình đăng ký đại lý",
      "Chính sách giá sỉ và chiết khấu",
      "Hỗ trợ marketing và bán hàng",
      "Logistics và cam kết giao hàng",
      "Câu chuyện đại lý thành công",
      "Kết luận",
    ],
    h3Sections: [
      { parentH2Index: 2, title: "Hồ sơ đăng ký đại lý cần chuẩn bị" },
      { parentH2Index: 4, title: "Catalogue, ảnh sản phẩm và file báo giá" },
      { parentH2Index: 5, title: "SLA giao hàng nội thành và liên tỉnh" },
    ],
    suggestedFaqs: [
      {
        question: "Làm sao đăng ký làm đại lý ATTD?",
        answer:
          "Liên hệ team sales qua form hoặc hotline, cung cấp thông tin shop/xưởng in và khu vực kinh doanh. ATTD sẽ tư vấn chính sách và bảng giá sỉ.",
      },
      {
        question: "Đại lý ATTD được hỗ trợ những gì?",
        answer:
          "Giá sỉ ưu đãi, giữ hàng mã bán chạy, file ảnh marketing, hỗ trợ báo giá khách cuối và giao hàng toàn quốc.",
      },
      {
        question: "Có cần vốn lớn để bắt đầu không?",
        answer:
          "Không bắt buộc. Shop mới có thể tester từ MOQ thấp 20–50 chiếc/màu trước khi scale.",
      },
    ],
    suggestedCta: `:::cta
title: Đăng ký làm đại lý
button: Xem chính sách đại lý
url: /dai-ly
:::`,
    suggestedTags: ["đại lý", "áo thun trơn sỉ", "chính sách đại lý", "B2B"],
    internalLinkKeywords: ["đại lý", "áo thun trơn sỉ", "nguồn hàng áo thun trơn"],
    categoryHints: ["đại lý", "chính sách"],
    ctaUrl: "/dai-ly",
  },
  {
    id: "corporate-uniform",
    label: "Corporate Uniform",
    exampleKeyword: "Đồng phục công ty",
    audienceOption: "corporate-uniform",
    structure: [
      "Vì sao doanh nghiệp cần đồng phục thống nhất",
      "Tiêu chí chọn vải và form áo đồng phục",
      "Size guide và bảng màu phổ biến",
      "Quy trình sản xuất đồng phục công ty",
      "In logo và nhận diện thương hiệu",
      "Báo giá đồng phục theo quy mô nhân sự",
      "Case study doanh nghiệp",
      "Kết luận",
    ],
    h3Sections: [
      { parentH2Index: 1, title: "Cotton vs CVC cho môi trường văn phòng" },
      { parentH2Index: 3, title: "Tư vấn → duyệt mẫu → sản xuất → giao hàng" },
      { parentH2Index: 5, title: "Dự phòng 5–10% size cho nhân viên mới" },
    ],
    suggestedFaqs: [
      {
        question: "ATTD có sản xuất đồng phục công ty theo size curve nam/nữ không?",
        answer:
          "Có. ATTD tư vấn size matrix theo số lượng nhân sự và dự phòng thêm 5–10% cho tuyển dụng mới.",
      },
      {
        question: "Timeline sản xuất đồng phục doanh nghiệp bao lâu?",
        answer:
          "Tùy số lượng và công in/thêu. Dự án 200–500 chiếc thường 2–4 tuần sau khi duyệt mẫu.",
      },
      {
        question: "Có thể in logo và may tem riêng thương hiệu không?",
        answer:
          "Có. ATTD hỗ trợ in lụa, chuyển nhiệt, thêu logo và tem woven/care label theo brand guideline.",
      },
    ],
    suggestedCta: CTA_BLOCK_SNIPPET,
    suggestedTags: ["đồng phục công ty", "áo thun công ty", "OEM", "in logo"],
    internalLinkKeywords: ["OEM", "quà tặng doanh nghiệp", "áo thun trơn sỉ"],
    categoryHints: ["đồng phục", "doanh nghiệp"],
    ctaUrl: "/lien-he",
  },
  {
    id: "corporate-gift",
    label: "Corporate Gift",
    exampleKeyword: "Quà tặng doanh nghiệp",
    audienceOption: "corporate-gift",
    structure: [
      "Nhu cầu quà tặng B2B và xu hướng 2026",
      "Gợi ý sản phẩm quà tặng từ áo thun và polo",
      "Quy trình in logo và đóng gói quà tặng",
      "Ngân sách và MOQ quà tặng doanh nghiệp",
      "Set quà tết và quà sự kiện",
      "Case study doanh nghiệp",
      "Checklist chọn nhà cung cấp quà tặng",
      "Kết luận",
    ],
    h3Sections: [
      { parentH2Index: 1, title: "Áo thun, polo và combo túi tote" },
      { parentH2Index: 2, title: "Đóng hộp giấy và set quà theo bộ" },
      { parentH2Index: 4, title: "Quà tết, onboarding và event year-end" },
    ],
    suggestedFaqs: [
      {
        question: "ATTD có làm set quà tặng doanh nghiệp trọn gói không?",
        answer:
          "Có. ATTD triển khai combo áo thun/polo kèm túi, hộp giấy hoặc set đồng phục theo ngân sách dự án.",
      },
      {
        question: "MOQ quà tặng doanh nghiệp thường bao nhiêu?",
        answer:
          "Tùy sản phẩm và công in. Dự án quà tặng thường từ 100–300 bộ trở lên; liên hệ để nhận tư vấn cụ thể.",
      },
      {
        question: "Có hỗ trợ thiết kế artwork in logo không?",
        answer:
          "Có. Team ATTD hỗ trợ tư vấn vị trí in, màu sắc và file in phù hợp chất liệu vải.",
      },
    ],
    suggestedCta: `:::cta
title: Nhận tư vấn quà tặng doanh nghiệp
button: Liên hệ ATTD
url: /qua-tang-doanh-nghiep
:::`,
    suggestedTags: ["quà tặng doanh nghiệp", "quà tết", "in logo", "OEM"],
    internalLinkKeywords: ["quà tặng doanh nghiệp", "OEM", "đồng phục"],
    categoryHints: ["quà tặng", "doanh nghiệp"],
    ctaUrl: "/qua-tang-doanh-nghiep",
  },
];

export function resolveBlueprint(input: {
  keyword: string;
  primaryTopic?: string;
  b2bDealer?: boolean;
  oem?: boolean;
  corporateUniform?: boolean;
  corporateGift?: boolean;
}): ContentBlueprint {
  const keyword = `${input.keyword} ${input.primaryTopic ?? ""}`.toLowerCase();

  if (input.oem || keyword.includes("oem") || keyword.includes("private label")) {
    return CONTENT_BLUEPRINTS.find((b) => b.id === "oem")!;
  }
  if (
    input.corporateGift ||
    keyword.includes("quà tặng") ||
    keyword.includes("qua tang")
  ) {
    return CONTENT_BLUEPRINTS.find((b) => b.id === "corporate-gift")!;
  }
  if (
    input.corporateUniform ||
    keyword.includes("đồng phục") ||
    keyword.includes("dong phuc")
  ) {
    return CONTENT_BLUEPRINTS.find((b) => b.id === "corporate-uniform")!;
  }
  if (input.b2bDealer || keyword.includes("đại lý") || keyword.includes("dai ly")) {
    return CONTENT_BLUEPRINTS.find((b) => b.id === "dealer-recruitment")!;
  }
  if (keyword.includes("nguồn hàng") || keyword.includes("nguon hang") || keyword.includes("sỉ")) {
    return CONTENT_BLUEPRINTS.find((b) => b.id === "source-supplier")!;
  }

  return CONTENT_BLUEPRINTS[0];
}

export function getBlueprintById(id: ContentBlueprintId): ContentBlueprint {
  return CONTENT_BLUEPRINTS.find((b) => b.id === id) ?? CONTENT_BLUEPRINTS[0];
}
