/**
 * Knowledge-aware prompt composer.
 *
 * Composes a complete prompt for AI generation that incorporates:
 * - User instruction / keyword
 * - Content type and SEO intent
 * - Brand voice
 * - Knowledge Base context (from KB entries)
 * - Output language and format
 * - Internal warnings about data quality
 */

const ATTD_RULES = `
Quy tắc nội dung ATTD (bắt buộc tuân thủ):
- Sử dụng dữ liệu Knowledge Base như nguồn sự thật chính về ATTD.
- Không bịa đặt số liệu, chứng chỉ, khách hàng, hay cam kết chưa có trong Knowledge Base.
- Nếu thiếu thông tin, viết theo hướng tổng quát hoặc đánh dấu [CẦN XEM LẠI].
- Giữ giọng văn tiếng Việt, chuyên nghiệp B2B.
- CTA phải phù hợp với ATTD (nhà sản xuất, sỉ, OEM, đồng phục, quà tặng doanh nghiệp).
- Tránh thống kê giả, khách hàng giả, chứng nhận giả.
`.trim();

export type KnowledgeAwarePromptInput = {
  userInstruction: string;
  contentType?: string;
  seoIntent?: string;
  targetKeyword?: string;
  brandVoice?: string;
  outputLanguage?: "vi" | "en";
  knowledgeContextText?: string;
  warnings?: string[];
};

export function composeKnowledgeAwarePrompt(input: KnowledgeAwarePromptInput): string {
  const parts: string[] = [];

  parts.push(`Nhiệm vụ: ${input.userInstruction}`);

  if (input.contentType) {
    parts.push(`Loại nội dung: ${input.contentType}`);
  }

  if (input.targetKeyword) {
    parts.push(`Từ khóa mục tiêu: ${input.targetKeyword}`);
  }

  if (input.seoIntent) {
    parts.push(`Search intent: ${input.seoIntent}`);
  }

  if (input.brandVoice) {
    parts.push(`Giọng thương hiệu: ${input.brandVoice}`);
  }

  const lang = input.outputLanguage ?? "vi";
  parts.push(`Ngôn ngữ đầu ra: ${lang === "vi" ? "Tiếng Việt" : "English"}`);

  parts.push("\n---\n" + ATTD_RULES + "\n---");

  if (input.knowledgeContextText?.trim()) {
    parts.push(
      "\n---\nNGỮ CẢNH KNOWLEDGE BASE (dùng làm nguồn sự thật chính):\n---\n" +
        input.knowledgeContextText.trim()
    );
  } else {
    parts.push(
      "\n⚠ Không có ngữ cảnh Knowledge Base. Nội dung có thể chưa sát dữ liệu nội bộ ATTD."
    );
  }

  if (input.warnings && input.warnings.length > 0) {
    parts.push(
      "\n⚠ Cảnh báo dữ liệu:\n" + input.warnings.map((w) => `- ${w}`).join("\n")
    );
  }

  return parts.join("\n");
}

/**
 * Returns a compact snapshot of used KB entries for audit storage.
 */
export type KnowledgeAuditSnapshot = {
  query: string;
  generatedAt: string;
  entries: Array<{
    id: string;
    title: string;
    source?: string | null;
    aiReadinessScore: number;
    isVerified: boolean;
  }>;
  averageReadinessScore: number;
  warnings: string[];
};

export function buildKnowledgeAuditSnapshot(input: {
  query: string;
  entries: Array<{
    id: string;
    title: string;
    source?: { name?: string | null; url?: string | null } | null;
    aiReadiness: { score: number };
    isVerified: boolean;
  }>;
  averageReadinessScore: number;
  warnings: string[];
}): KnowledgeAuditSnapshot {
  return {
    query: input.query,
    generatedAt: new Date().toISOString(),
    entries: input.entries.map((e) => ({
      id: e.id,
      title: e.title,
      source: e.source?.name ?? e.source?.url ?? null,
      aiReadinessScore: e.aiReadiness.score,
      isVerified: e.isVerified,
    })),
    averageReadinessScore: input.averageReadinessScore,
    warnings: input.warnings,
  };
}
