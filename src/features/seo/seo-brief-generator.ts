import type {
  SeoBrief,
  SeoBriefInput,
  SeoBriefMetadata,
  SeoBriefResponse,
  SearchIntent,
} from "@/features/seo/seo-brief-types";
import { composeSeoBriefPrompt } from "@/features/seo/seo-brief-prompt-composer";
import { buildKnowledgeContext } from "@/features/ai/ai-knowledge-context-builder";
import type { KnowledgeContextEntry } from "@/features/ai/ai-knowledge-context-builder";

// Deterministic mock brief generation from keyword + KB context
function detectSearchIntent(keyword: string): SearchIntent {
  const k = keyword.toLowerCase();
  if (k.includes("giá") || k.includes("mua") || k.includes("đặt")) return "transactional";
  if (k.includes("so sánh") || k.includes("review") || k.includes("tốt nhất")) return "commercial";
  if (k.includes("là gì") || k.includes("cách") || k.includes("hướng dẫn")) return "informational";
  return "commercial";
}

function buildMockOutline(keyword: string, facts: KnowledgeContextEntry[]): SeoBrief["outline"] {
  const outline: SeoBrief["outline"] = [
    { level: "H2", heading: `${keyword} là gì? Tổng quan cho doanh nghiệp`, notes: "Giới thiệu khái niệm, lý do quan tâm từ góc B2B" },
    { level: "H3", heading: "Định nghĩa và phân loại", notes: "Giải thích ngắn gọn" },
    { level: "H3", heading: "Ứng dụng trong doanh nghiệp Việt Nam", notes: "Dẫn chứng thực tế" },
    { level: "H2", heading: `Tại sao chọn ATTD cho ${keyword}`, notes: "Lợi thế cạnh tranh của ATTD" },
    { level: "H3", heading: "Năng lực sản xuất và sỉ", notes: "Từ KB entries nếu có" },
    { level: "H3", heading: "Quy trình đặt hàng và MOQ", notes: "Thực tế, không bịa số liệu" },
    { level: "H2", heading: `Hướng dẫn chọn nhà cung cấp ${keyword} uy tín`, notes: "Giúp B2B buyer ra quyết định" },
    { level: "H2", heading: "Bảng giá tham khảo và chính sách sỉ", notes: "Chú ý: chỉ dùng dữ liệu từ KB, không bịa giá" },
    { level: "H2", heading: "Câu hỏi thường gặp về " + keyword, notes: "Từ FAQ section" },
    { level: "H2", heading: "Liên hệ ATTD — Tư vấn miễn phí", notes: "CTA cuối bài" },
  ];

  if (facts.length > 0) {
    outline[1] = {
      level: "H3",
      heading: `Dữ liệu thực tế: ${facts[0].title}`,
      notes: `Sử dụng fact từ Knowledge Base — ${facts[0].category ?? ""}`,
    };
  }

  return outline;
}

function buildMockFaq(keyword: string): SeoBrief["faq"] {
  return [
    {
      question: `${keyword} có MOQ tối thiểu là bao nhiêu?`,
      answerDirection: "Nêu MOQ thực tế từ Knowledge Base nếu có, nếu không ghi [Cần kiểm tra]",
    },
    {
      question: `Thời gian giao hàng ${keyword} là bao lâu?`,
      answerDirection: "Lead time thực tế từ KB hoặc thông tin chung về ngành",
    },
    {
      question: `ATTD có hỗ trợ in/thêu logo riêng cho ${keyword} không?`,
      answerDirection: "Mô tả dịch vụ OEM/in theo yêu cầu của ATTD",
    },
    {
      question: `Làm thế nào để trở thành đại lý ${keyword} của ATTD?`,
      answerDirection: "Điều kiện, quyền lợi đại lý từ KB hoặc chính sách chung",
    },
    {
      question: `${keyword} có những chất liệu nào phù hợp với đồng phục doanh nghiệp?`,
      answerDirection: "Liệt kê chất liệu từ Knowledge Base — cotton, CVC, TC, v.v.",
    },
  ];
}

function buildInternalLinks(keyword: string): SeoBrief["internalLinkSuggestions"] {
  return [
    { anchorText: "áo thun trơn sỉ", targetUrl: "/nguon-hang-ao-thun-tron", reason: "Nguồn hàng liên quan" },
    { anchorText: "đồng phục công ty", targetUrl: "/ao-thun-cong-ty", reason: "Từ khóa liên quan" },
    { anchorText: "OEM theo yêu cầu", targetUrl: "/oem", reason: "Dịch vụ OEM của ATTD" },
    { anchorText: "chính sách đại lý ATTD", targetUrl: "/chinh-sach-dai-ly", reason: "Đại lý muốn tìm hiểu" },
  ].filter((link) => {
    const kLower = keyword.toLowerCase();
    if (kLower.includes("đồng phục") && link.anchorText.includes("đồng phục")) return true;
    if (kLower.includes("oem") && link.anchorText.includes("OEM")) return true;
    if (kLower.includes("đại lý") && link.anchorText.includes("đại lý")) return true;
    return true;
  });
}

function buildRequiredFacts(entries: KnowledgeContextEntry[]): SeoBrief["requiredKnowledgeFacts"] {
  if (entries.length === 0) {
    return [
      { title: "Thông tin chưa có trong KB", fact: "[Cần bổ sung dữ liệu vào Knowledge Base trước khi viết]" },
    ];
  }

  return entries.slice(0, 5).map((entry) => ({
    entryId: entry.id,
    title: entry.title,
    fact: (entry.summary ?? entry.content ?? "").slice(0, 200).trim() || "[Xem nội dung đầy đủ trong KB]",
  }));
}

function buildCtaSuggestions(keyword: string): string[] {
  return [
    `Nhận báo giá ${keyword} — Liên hệ ATTD ngay hôm nay`,
    `Đặt mẫu miễn phí — Tìm hiểu chính sách sỉ ATTD`,
    `Chat Zalo để được tư vấn về ${keyword} trong 5 phút`,
    `Xem danh mục sản phẩm — Tải bảng giá sỉ mới nhất`,
  ];
}

function buildSecondarykeywords(keyword: string): string[] {
  const base = keyword.toLowerCase();
  const suggestions: string[] = [];
  if (!base.includes("sỉ")) suggestions.push(keyword + " sỉ");
  if (!base.includes("giá")) suggestions.push("giá " + keyword);
  if (!base.includes("uy tín")) suggestions.push(keyword + " uy tín");
  if (!base.includes("chất lượng")) suggestions.push(keyword + " chất lượng cao");
  suggestions.push("nhà cung cấp " + keyword);
  return suggestions.slice(0, 4);
}

export async function generateSeoBrief(input: SeoBriefInput): Promise<SeoBriefResponse> {
  const { targetKeyword } = input;

  let contextEntries: KnowledgeContextEntry[] = [];
  let contextText = input.knowledgeContext?.contextText ?? "";
  const selectedEntryIds = input.knowledgeContext?.selectedEntryIds ?? [];
  let readinessAverage = input.knowledgeContext?.averageReadinessScore ?? 0;
  let kbWarnings = input.knowledgeContext?.warnings ?? [];

  if (selectedEntryIds.length > 0 || !contextText) {
    try {
      const built = await buildKnowledgeContext({
        query: targetKeyword,
        selectedEntryIds: selectedEntryIds.length > 0 ? selectedEntryIds : undefined,
        limit: 6,
      });
      contextEntries = built.entries;
      if (!contextText) contextText = built.contextText;
      readinessAverage = built.averageReadinessScore;
      kbWarnings = [...new Set([...kbWarnings, ...built.warnings])];
    } catch {
      // Proceed with empty context if KB lookup fails
    }
  }

  const prompt = composeSeoBriefPrompt({
    targetKeyword,
    secondaryKeywords: input.secondaryKeywords,
    searchIntent: input.searchIntent,
    audience: input.audience,
    contentGoal: input.contentGoal,
    knowledgeContextText: contextText,
    warnings: kbWarnings,
  });

  // Mock brief — deterministic from keyword + context
  const intent = input.searchIntent ?? detectSearchIntent(targetKeyword);
  const secondaryKeywords = input.secondaryKeywords ?? buildSecondarykeywords(targetKeyword);

  const warnings: string[] = [...kbWarnings];
  if (contextEntries.length === 0) {
    warnings.push("Không có dữ liệu Knowledge Base — kiểm tra lại các fact trong brief.");
  }
  const unverified = contextEntries.filter((e) => !e.isVerified);
  if (unverified.length > 0 && !warnings.some((w) => w.includes("chưa được kiểm chứng"))) {
    warnings.push(`${unverified.length} mục KB chưa được kiểm chứng — cần xác nhận trước khi publish.`);
  }

  const brief: SeoBrief = {
    targetKeyword,
    secondaryKeywords,
    searchIntent: intent,
    audience: input.audience ?? "Đại lý, chủ xưởng in, doanh nghiệp cần đồng phục / quà tặng B2B",
    contentGoal: input.contentGoal ?? "Tăng organic traffic B2B, generate leads từ đại lý và doanh nghiệp",
    recommendedTitle: `${targetKeyword.charAt(0).toUpperCase() + targetKeyword.slice(1)} — Hướng Dẫn Toàn Diện Cho Doanh Nghiệp B2B | ATTD`,
    metaTitleIdeas: [
      `${targetKeyword} sỉ uy tín tại ATTD | OEM, Đồng phục, Quà tặng`,
      `Nguồn ${targetKeyword} chất lượng — Bảng giá sỉ 2025 | ATTD.vn`,
    ],
    metaDescriptionIdeas: [
      `Tìm nhà cung cấp ${targetKeyword} uy tín cho doanh nghiệp? ATTD cung cấp sỉ, OEM và đồng phục theo yêu cầu. Liên hệ nhận báo giá ngay.`,
      `${targetKeyword} chất lượng cao, MOQ linh hoạt, giao hàng toàn quốc. ATTD — đối tác sản xuất B2B đáng tin cậy.`,
    ],
    contentAngle: `Bài viết giúp B2B buyer (đại lý, doanh nghiệp) hiểu rõ về ${targetKeyword} từ góc độ nguồn hàng, chất lượng, MOQ và quy trình đặt hàng với ATTD — nhà sản xuất trực tiếp.`,
    outline: buildMockOutline(targetKeyword, contextEntries),
    faq: buildMockFaq(targetKeyword),
    internalLinkSuggestions: buildInternalLinks(targetKeyword),
    ctaSuggestions: buildCtaSuggestions(targetKeyword),
    requiredKnowledgeFacts: buildRequiredFacts(contextEntries),
    contentWarnings: warnings.length > 0 ? warnings : undefined,
    estimatedWordCount: 1800,
  } as SeoBrief;

  const metadata: SeoBriefMetadata = {
    targetKeyword,
    usedKnowledgeEntryIds: contextEntries.map((e) => e.id),
    knowledgeReadinessAverage: readinessAverage,
    knowledgeWarnings: kbWarnings,
    generatedAt: new Date().toISOString(),
  };

  return { brief, prompt, metadata };
}
