import type { SearchIntent } from "@/features/seo/seo-brief-types";

const ATTD_CONTEXT = `
Về ATTD.vn:
- Nhà sản xuất và nhà phân phối sỉ quần áo B2B tại Việt Nam
- Chuyên áo thun trơn sỉ, áo polo trơn, OEM/private label
- Cung cấp đồng phục doanh nghiệp, quà tặng doanh nghiệp
- Mạng lưới đại lý toàn quốc
- Khách hàng: đại lý, xưởng in, doanh nghiệp, tổ chức
`.trim();

const BRIEF_RULES = `
Quy tắc tạo SEO Brief:
- Sử dụng dữ liệu Knowledge Base như nguồn sự thật chính về ATTD.
- Không bịa đặt số liệu, chứng chỉ, khách hàng, hay cam kết không có trong Knowledge Base.
- Nếu không chắc chắn về thông tin, đánh dấu là [Cần kiểm tra].
- Ưu tiên tiếng Việt, giọng văn B2B chuyên nghiệp.
- CTA cần phù hợp với ATTD (sỉ, OEM, đồng phục, quà tặng doanh nghiệp).
- Tránh thống kê giả, chứng nhận giả, hoặc cam kết vô căn cứ.
- Outline phải tập trung vào helping B2B buyer ra quyết định.
`.trim();

export function composeSeoBriefPrompt(input: {
  targetKeyword: string;
  secondaryKeywords?: string[];
  searchIntent?: SearchIntent | string;
  audience?: string;
  contentGoal?: string;
  knowledgeContextText?: string;
  brandVoice?: string;
  outputLanguage?: "vi" | "en";
  warnings?: string[];
}): string {
  const parts: string[] = [];

  parts.push(`Tạo SEO Content Brief hoàn chỉnh cho ATTD.vn.`);
  parts.push(`\n${ATTD_CONTEXT}`);
  parts.push(`\n${BRIEF_RULES}`);

  parts.push(`\n---\nTHÔNG TIN ĐẦU VÀO\n---`);
  parts.push(`Từ khóa chính: ${input.targetKeyword}`);

  if (input.secondaryKeywords?.length) {
    parts.push(`Từ khóa phụ: ${input.secondaryKeywords.join(", ")}`);
  }

  if (input.searchIntent) {
    parts.push(`Search intent: ${input.searchIntent}`);
  }

  if (input.audience) {
    parts.push(`Đối tượng đọc: ${input.audience}`);
  }

  if (input.contentGoal) {
    parts.push(`Mục tiêu nội dung: ${input.contentGoal}`);
  }

  if (input.brandVoice) {
    parts.push(`Giọng thương hiệu: ${input.brandVoice}`);
  }

  const lang = input.outputLanguage ?? "vi";
  parts.push(`Ngôn ngữ đầu ra: ${lang === "vi" ? "Tiếng Việt" : "English"}`);

  if (input.knowledgeContextText?.trim()) {
    parts.push(
      `\n---\nNGỮ CẢNH KNOWLEDGE BASE (dùng làm nguồn sự thật chính):\n---\n` +
        input.knowledgeContextText.trim()
    );
  } else {
    parts.push(`\n⚠ Không có ngữ cảnh Knowledge Base. Brief sẽ dựa trên kiến thức chung về ATTD.`);
  }

  if (input.warnings?.length) {
    parts.push(`\n⚠ Cảnh báo dữ liệu:\n` + input.warnings.map((w) => `- ${w}`).join("\n"));
  }

  parts.push(`
---
YÊU CẦU ĐẦU RA (JSON)
---
Trả về JSON với cấu trúc sau:
{
  "searchIntent": "informational | commercial | transactional | navigational | mixed",
  "recommendedTitle": "Tiêu đề bài viết đề xuất (có từ khóa, ≤70 ký tự)",
  "metaTitleIdeas": ["Meta title 1 (≤60 ký tự)", "Meta title 2"],
  "metaDescriptionIdeas": ["Meta description 1 (140-160 ký tự, có CTA)", "Meta description 2"],
  "contentAngle": "Góc tiếp cận nội dung — lý do tại sao bài này độc đáo với ATTD",
  "audience": "Mô tả đối tượng đọc cụ thể",
  "contentGoal": "Mục tiêu nội dung (vd: tăng traffic từ đại lý, tăng OEM leads)",
  "secondaryKeywords": ["từ khóa phụ 1", "từ khóa phụ 2"],
  "outline": [
    { "level": "H2", "heading": "Tiêu đề H2", "notes": "gợi ý nội dung" },
    { "level": "H3", "heading": "Tiêu đề H3", "notes": "gợi ý nội dung" }
  ],
  "faq": [
    { "question": "Câu hỏi thường gặp?", "answerDirection": "Hướng trả lời ngắn gọn" }
  ],
  "internalLinkSuggestions": [
    { "anchorText": "áo thun trơn sỉ", "targetUrl": "/nguon-hang-ao-thun-tron", "reason": "Liên kết nguồn hàng" }
  ],
  "ctaSuggestions": ["CTA 1", "CTA 2"],
  "requiredKnowledgeFacts": [
    { "title": "Tên fact", "fact": "Nội dung fact cần đưa vào bài" }
  ],
  "contentWarnings": ["Cảnh báo nếu có thông tin cần kiểm chứng"],
  "estimatedWordCount": 1800
}

Chỉ trả về JSON, không có văn bản bao quanh.
`);

  return parts.join("\n");
}
