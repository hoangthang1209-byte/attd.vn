import type { ContentBlueprint } from "@/features/blog/content-blueprints";
import { resolveBlueprint } from "@/features/blog/content-blueprints";

export type AiAudienceOptions = {
  b2bDealer: boolean;
  oem: boolean;
  corporateUniform: boolean;
  corporateGift: boolean;
};

export type AiContentLength = 1200 | 1800 | 2500;

export type AiPromptInput = {
  keyword: string;
  primaryTopic?: string;
  searchIntent?: string;
  audiences: AiAudienceOptions;
  length: AiContentLength;
};

const ATTD_POSITIONING = `
ATTD positioning (must reflect in content):
- B2B sourcing platform for dealers, print shops, and enterprises
- Wholesale blank apparel (áo thun trơn sỉ, polo trơn)
- OEM / private label manufacturer
- Corporate uniform supplier
- Corporate gifts supplier
- Dealer network across Vietnam
`.trim();

function audienceLabels(audiences: AiAudienceOptions): string[] {
  const labels: string[] = [];
  if (audiences.b2bDealer) labels.push("B2B Dealer / đại lý");
  if (audiences.oem) labels.push("OEM / private label");
  if (audiences.corporateUniform) labels.push("Corporate Uniform / đồng phục công ty");
  if (audiences.corporateGift) labels.push("Corporate Gift / quà tặng doanh nghiệp");
  return labels.length > 0 ? labels : ["B2B general"];
}

function blueprintContext(blueprint: ContentBlueprint): string {
  return `
Suggested article structure (H2 sections):
${blueprint.structure.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Suggested H3 subsections:
${blueprint.h3Sections.map((h) => `- Under "${blueprint.structure[h.parentH2Index]}": ${h.title}`).join("\n")}

Internal-link keywords to use naturally:
${blueprint.internalLinkKeywords.join(", ")}

Suggested tags: ${blueprint.suggestedTags.join(", ")}
`.trim();
}

export function generateArticlePrompt(input: AiPromptInput): string {
  const blueprint = resolveBlueprint({
    keyword: input.keyword,
    primaryTopic: input.primaryTopic,
    ...input.audiences,
  });

  return `Viết bài blog SEO tiếng Việt cho ATTD.vn.

${ATTD_POSITIONING}

---
INPUT
---
Keyword chính: ${input.keyword}
Primary topic: ${input.primaryTopic || "(tự suy luận từ keyword)"}
Search intent: ${input.searchIntent || "informational + commercial B2B"}
Target audience: ${audienceLabels(input.audiences).join(", ")}
Target length: ~${input.length} từ

${blueprintContext(blueprint)}

---
OUTPUT RULES
---
- Output MARKDOWN only
- DO NOT include H1 (# heading) — CMS title field is the H1
- Start with introduction paragraphs (no heading)
- Include 6–10 H2 sections (##)
- Include at least 3 H3 sections (###)
- Include at least 1 markdown table
- Include bullet lists
- Include internal-link keywords naturally: ${blueprint.internalLinkKeywords.join(", ")}
- End with CTA block:
${blueprint.suggestedCta}
- Append 3 FAQ blocks:
:::faq
Q: ...
A: ...
:::

Tone: professional B2B, practical, Vietnamese.
Focus on helping dealers, print shops, and enterprises make sourcing decisions.
Mention ATTD as wholesaler + OEM + uniform + corporate gift supplier where relevant.`.trim();
}

export function generateFaqPrompt(input: AiPromptInput): string {
  const blueprint = resolveBlueprint({
    keyword: input.keyword,
    primaryTopic: input.primaryTopic,
    ...input.audiences,
  });

  return `Tạo 5–8 câu hỏi FAQ cho bài blog SEO tiếng Việt về "${input.keyword}".

${ATTD_POSITIONING}

Primary topic: ${input.primaryTopic || input.keyword}
Search intent: ${input.searchIntent || "B2B sourcing"}
Audience: ${audienceLabels(input.audiences).join(", ")}

Gợi ý câu hỏi mẫu:
${blueprint.suggestedFaqs.map((f) => `- ${f.question}`).join("\n")}

Output format — mỗi FAQ một block:
:::faq
Q: Câu hỏi?
A: Câu trả lời chi tiết 2–4 câu.
:::

Rules:
- Tiếng Việt, B2B tone
- Trả lời thực tế về MOQ, giá sỉ, OEM, giao hàng, đại lý ATTD
- Không bịa số liệu cụ thể nếu không chắc — dùng khoảng hợp lý`.trim();
}

export function generateSeoPrompt(input: AiPromptInput): string {
  return `Tạo SEO metadata tiếng Việt cho bài blog ATTD.vn.

Keyword: ${input.keyword}
Primary topic: ${input.primaryTopic || input.keyword}
Search intent: ${input.searchIntent || "B2B informational"}
Article length target: ~${input.length} từ
Audience: ${audienceLabels(input.audiences).join(", ")}

${ATTD_POSITIONING}

Output JSON only:
{
  "title": "Tiêu đề bài viết (không quá 70 ký tự, có keyword)",
  "excerpt": "Tóm tắt 1–2 câu cho trang danh sách blog",
  "metaTitle": "Meta title (≤60 ký tự) | ATTD",
  "metaDescription": "Meta description 140–160 ký tự, có CTA nhẹ"
}

Rules:
- Tiếng Việt
- Title không trùng metaTitle hoàn toàn
- Meta description hấp dẫn click, phù hợp B2B`.trim();
}

export function generateTagsPrompt(input: AiPromptInput): string {
  const blueprint = resolveBlueprint({
    keyword: input.keyword,
    primaryTopic: input.primaryTopic,
    ...input.audiences,
  });

  return `Gợi ý 5–8 tags cho bài blog SEO tiếng Việt.

Keyword: ${input.keyword}
Primary topic: ${input.primaryTopic || input.keyword}
Audience: ${audienceLabels(input.audiences).join(", ")}

Gợi ý tags từ blueprint:
${blueprint.suggestedTags.join(", ")}

Output: một dòng tags cách nhau bởi dấu phẩy, lowercase where appropriate, tiếng Việt có dấu.
Ví dụ: nguồn hàng áo thun trơn, áo thun trơn sỉ, OEM, đại lý`.trim();
}
