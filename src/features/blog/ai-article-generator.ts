import type { ContentBlueprint } from "@/features/blog/content-blueprints";
import { resolveBlueprint } from "@/features/blog/content-blueprints";
import type { AiContentLength, AiPromptInput } from "@/features/blog/ai-prompts";
import { countWordsFromMarkdown } from "@/features/blog/word-count";
import { SITE_NAME } from "@/lib/seo";
import { toSlug } from "@/lib/slug";
import type { BlogFaqItem } from "@/features/blog/types";

export type GeneratedArticle = {
  title: string;
  slug: string;
  excerpt: string;
  markdown: string;
  tags: string[];
  faqJson: BlogFaqItem[];
  metaTitle: string;
  metaDescription: string;
};

const FILLER_PARAGRAPHS = [
  "Trong thực tế triển khai, team mua hàng cần đối chiếu báo giá với tồn kho, timeline giao hàng và khả năng hỗ trợ sau bán. Một nhà cung cấp phù hợp phải minh bạch từng hạng mục thay vì gom chung chi phí ẩn ở cuối báo giá.",
  "Đối với đại lý và xưởng in, yếu tố quyết định không chỉ là giá FOB mà còn là tỷ lệ hàng đạt chuẩn, tốc độ bù size/màu và mức độ phản hồi khi có khiếu nại. ATTD xây dựng quy trình QC và SLA giao hàng nhằm giảm rủi ro vận hành cho đối tác B2B.",
  "Doanh nghiệp triển khai đồng phục hoặc quà tặng cần lộ trình rõ ràng: duyệt mẫu, chốt size curve, sản xuất và giao chia nhiều điểm nếu cần. Partner có kinh nghiệm uniform và corporate gift sẽ chủ động đề xuất checklist thay vì để khách tự xử lý từng bước.",
  "Xu hướng 2026 cho thấy khách B2B ưu tiên nguồn hàng ổn định, có khả năng mở rộng sang OEM và combo quà tặng từ cùng một nhà cung cấp. Mô hình one-stop giúp rút ngắn thời gian ra mắt sản phẩm và giảm chi phí phối hợp nhiều xưởng.",
  "Khi đánh giá nhà cung cấp, hãy yêu cầu case study, mẫu thử và chính sách đổi trả lỗi sản xuất trước khi chốt hợp đồng dài hạn. Uy tín thể hiện qua cam kết thực thi, không chỉ qua catalogue marketing.",
];

function buildTitle(keyword: string, primaryTopic?: string): string {
  const base = primaryTopic?.trim() || keyword.trim();
  if (base.length > 65) return base.slice(0, 62) + "...";
  if (/^\d/.test(base) || base.includes(":")) return base;
  return `${base}: Hướng dẫn B2B cho đại lý và doanh nghiệp`;
}

function buildExcerpt(keyword: string, blueprint: ContentBlueprint): string {
  return `Hướng dẫn chi tiết về ${keyword.toLowerCase()} — ${blueprint.structure.slice(0, 3).join(", ").toLowerCase()} — dành cho đại lý, xưởng in và doanh nghiệp B2B làm việc với ATTD.`;
}

function buildMetaDescription(keyword: string, excerpt: string): string {
  const candidate = excerpt.length <= 160 ? excerpt : excerpt.slice(0, 157) + "...";
  if (candidate.length >= 120) return candidate;
  return `${candidate} Liên hệ ATTD để nhận báo giá và tư vấn ${keyword.toLowerCase()}.`.slice(
    0,
    160
  );
}

function sectionBody(
  sectionTitle: string,
  keyword: string,
  blueprint: ContentBlueprint,
  sectionIndex: number
): string {
  const linkKeyword = blueprint.internalLinkKeywords[sectionIndex % blueprint.internalLinkKeywords.length];
  const lines: string[] = [];

  lines.push(
    `Phần "${sectionTitle}" tập trung vào nhu cầu thực tế của khách B2B khi tìm hiểu **${keyword.toLowerCase()}**. `
      + `Với mô hình ${linkKeyword}, doanh nghiệp cần đánh giá nguồn hàng, quy trình và khả năng mở rộng dài hạn thay vì chỉ so sánh đơn giá.`
  );

  lines.push("");
  lines.push("Điểm cần lưu ý:");
  lines.push("- Minh bạch tồn kho và lịch nhập hàng");
  lines.push("- Quy trình QC và chính sách đổi trả lỗi sản xuất");
  lines.push("- Hỗ trợ báo giá nhanh và tư vấn chất liệu theo ngân sách");
  lines.push("- Khả năng mở rộng sang OEM, in logo và quà tặng doanh nghiệp");

  if (sectionIndex === 2) {
    lines.push("");
    lines.push("### Cotton, CVC và TC — chọn vải phù hợp");
    lines.push("");
    lines.push("| Chất liệu | Đặc điểm | Phù hợp cho |");
    lines.push("| --- | --- | --- |");
    lines.push("| Cotton 100% | Thoáng, cảm giác tự nhiên | Premium, quà tặng cao cấp |");
    lines.push("| CVC | Cân bằng giá – bền form | Shop sỉ, xưởng in số lượng lớn |");
    lines.push("| TC / Poly | Bền màu, ít nhăn | Event, team building |");
  }

  if (sectionIndex === 3) {
    lines.push("");
    lines.push("| Nhóm khách | MOQ gợi ý | Ghi chú |");
    lines.push("| --- | --- | --- |");
    lines.push("| Shop mới | 20–50 chiếc/màu | Tester thị trường |");
    lines.push("| Đại lý | 100–300 chiếc/màu | Giá tốt hơn, giữ hàng |");
    lines.push("| Dự án OEM/DN | 500+ chiếc | Tùy biến tem, màu |");
  }

  const h3ForSection = blueprint.h3Sections.filter((h) => h.parentH2Index === sectionIndex);
  for (const h3 of h3ForSection) {
    if (h3.title.includes("Cotton")) continue;
    lines.push("");
    lines.push(`### ${h3.title}`);
    lines.push("");
    lines.push(
      `ATTD hỗ trợ ${h3.title.toLowerCase()} với quy trình rõ ràng, phù hợp khách hàng B2B cần ${linkKeyword} ổn định. `
        + "Team tư vấn sẽ đề xuất lộ trình cụ thể theo ngân sách và timeline dự án."
    );
  }

  return lines.join("\n");
}

function buildFaqBlocks(faqs: BlogFaqItem[]): string {
  return faqs
    .map(
      (faq) => `:::faq
Q: ${faq.question}
A: ${faq.answer}
:::`
    )
    .join("\n\n");
}

function padToLength(markdown: string, target: AiContentLength): string {
  let result = markdown;
  let fillerIndex = 0;

  while (countWordsFromMarkdown(result) < target && fillerIndex < FILLER_PARAGRAPHS.length * 4) {
    const filler = FILLER_PARAGRAPHS[fillerIndex % FILLER_PARAGRAPHS.length];
    const insertBefore = result.lastIndexOf("\n\n:::cta");
    if (insertBefore === -1) {
      result += `\n\n${filler}`;
    } else {
      result = `${result.slice(0, insertBefore)}\n\n${filler}${result.slice(insertBefore)}`;
    }
    fillerIndex += 1;
  }

  return result;
}

export function generateSeoMetadata(input: AiPromptInput): Pick<
  GeneratedArticle,
  "title" | "excerpt" | "metaTitle" | "metaDescription"
> {
  const blueprint = resolveBlueprint({
    keyword: input.keyword,
    primaryTopic: input.primaryTopic,
    ...input.audiences,
  });
  const keyword = input.keyword.trim();
  const title = buildTitle(keyword, input.primaryTopic);
  const excerpt = buildExcerpt(keyword, blueprint);
  const metaTitle = `${title.length > 50 ? title.slice(0, 50) : title} | ${SITE_NAME}`;
  const metaDescription = buildMetaDescription(keyword, excerpt);
  return { title, excerpt, metaTitle, metaDescription };
}

export function generateArticleStructure(input: AiPromptInput): GeneratedArticle {
  const blueprint = resolveBlueprint({
    keyword: input.keyword,
    primaryTopic: input.primaryTopic,
    ...input.audiences,
  });

  const keyword = input.keyword.trim();
  const title = buildTitle(keyword, input.primaryTopic);
  const excerpt = buildExcerpt(keyword, blueprint);
  const metaTitle = `${title.length > 50 ? title.slice(0, 50) : title} | ${SITE_NAME}`;
  const metaDescription = buildMetaDescription(keyword, excerpt);

  const intro = [
    `Thị trường B2B ngành may mặc đang yêu cầu đối tác cung ứng không chỉ bán hàng mà còn tư vấn sát nhu cầu **${keyword.toLowerCase()}**. `,
    `Bài viết này tổng hợp hướng dẫn thực chiến cho đại lý, xưởng in và doanh nghiệp — từ ${blueprint.structure[0].toLowerCase()} đến ${blueprint.structure[blueprint.structure.length - 1].toLowerCase()} — `,
    `giúp bạn đánh giá nhà cung cấp trước khi triển khai dự án với ${blueprint.internalLinkKeywords[0]}.`,
  ].join("");

  const sections = blueprint.structure.map((sectionTitle, index) => {
    return `## ${sectionTitle}\n\n${sectionBody(sectionTitle, keyword, blueprint, index)}`;
  });

  const faqJson = blueprint.suggestedFaqs;
  const markdownParts = [
    intro,
    "",
    ...sections.flatMap((s) => [s, ""]),
    blueprint.suggestedCta,
    "",
    buildFaqBlocks(faqJson),
  ];

  let markdown = padToLength(markdownParts.join("\n"), input.length);

  return {
    title,
    slug: toSlug(title),
    excerpt,
    markdown,
    tags: blueprint.suggestedTags,
    faqJson,
    metaTitle,
    metaDescription,
  };
}
