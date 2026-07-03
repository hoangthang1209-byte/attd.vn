import "server-only";
import {
  EMPTY_WHATSAPP_EXTRACTED,
  type WhatsAppAssistantAnalysis,
  type WhatsAppAssistantExtracted,
  type WhatsAppAssistantInput,
} from "@/features/crm/whatsapp-assistant/types";

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

const FIELD_KEYS = Object.keys(EMPTY_WHATSAPP_EXTRACTED) as Array<keyof WhatsAppAssistantExtracted>;

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[.,;)]$/, "");
  }
  return "";
}

function detectLanguage(rawChatText: string): string {
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(rawChatText)) {
    return "Vietnamese";
  }
  if (/\b(hola|gracias|precio|camiseta|algod[oó]n)\b/i.test(rawChatText)) return "Spanish";
  if (/\b(bonjour|merci|prix|t-shirt|coton)\b/i.test(rawChatText)) return "French";
  return "English";
}

function extractFallback(input: WhatsAppAssistantInput): WhatsAppAssistantExtracted {
  const text = input.rawChatText;
  const productType = firstMatch(text, [
    /\b(t-?shirts?|polo shirts?|hoodies?|caps?|hats?|tote bags?|uniforms?|jackets?|promotional products?)\b/i,
    /\b(áo thun|áo polo|hoodie|nón|mũ|túi tote|đồng phục)\b/i,
  ]);

  return {
    ...EMPTY_WHATSAPP_EXTRACTED,
    customerName: asText(input.customerName),
    companyName: asText(input.company),
    email: asText(input.email) || firstMatch(text, [/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i]),
    phone: asText(input.phone) || firstMatch(text, [/(\+?\d[\d\s().-]{7,}\d)/]),
    country: firstMatch(text, [/\b(?:from|in|country[:\s]+)([A-Z][A-Za-z\s]{2,40})/i]),
    productType,
    quantity: firstMatch(text, [
      /(\d[\d,\s.]*)\s*(?:pcs|pieces|units|shirts|t-?shirts|polos|hoodies|caps|bags|cái|chiếc)\b/i,
      /(?:need|order|quote for|looking for)\s+(\d[\d,\s.]*)\b/i,
    ]),
    fabric: firstMatch(text, [/\b((?:100%\s*)?cotton|polyester|cvc|tc|spandex|fleece|pique|jersey)\b/i]),
    gsm: firstMatch(text, [/(\d{2,3}\s*gsm)\b/i]),
    color: firstMatch(text, [/\b(?:color|colour|màu)[:\s]+([A-Za-zÀ-ỹ,\s/-]{2,60})/i]),
    sizeBreakdown: firstMatch(text, [/\b(?:size|sizes)[:\s]+([A-Z0-9,\s/-]{2,60})/i]),
    logoOrDesign: /\b(logo|artwork|design|print|embroidery|thêu|in)\b/i.test(text) ? "Có nhắc tới logo/thiết kế" : "",
    decorationMethod: firstMatch(text, [/\b(screen print|silk screen|embroidery|heat transfer|dtf|sublimation)\b/i]),
    packaging: firstMatch(text, [/\b(?:packaging|packing)[:\s]+([A-Za-z0-9,\s/-]{2,80})/i]),
    deliveryCountry: firstMatch(text, [/\b(?:ship to|shipped to|deliver to|delivery to)[:\s]+([A-Z][A-Za-z\s]{2,40})/i]),
    deadline: firstMatch(text, [/\b(?:deadline|need by|needed by|delivery date)[:\s]+([A-Za-z0-9,\s/-]{2,50})/i]),
    incoterm: firstMatch(text, [/\b(EXW|FOB|CIF|DAP|DDP)\b/i]).toUpperCase(),
    budgetTarget: firstMatch(text, [/\b(?:budget|target price|price target)[:\s]+([$€£]?\s?\d[\d,.\s]*)/i]),
  };
}

function missingFromExtracted(extracted: WhatsAppAssistantExtracted): string[] {
  const required: Array<[keyof WhatsAppAssistantExtracted, string]> = [
    ["productType", "Loại sản phẩm cần sản xuất"],
    ["quantity", "Số lượng dự kiến"],
    ["fabric", "Chất liệu hoặc yêu cầu vải"],
    ["color", "Màu sắc"],
    ["sizeBreakdown", "Bảng size / size breakdown"],
    ["logoOrDesign", "File logo/thiết kế hoặc mô tả vị trí in/thêu"],
    ["deliveryCountry", "Quốc gia giao hàng"],
    ["deadline", "Deadline mong muốn"],
  ];
  return required.filter(([key]) => !extracted[key]).map(([, label]) => label);
}

function scoreLead(extracted: WhatsAppAssistantExtracted): "LOW" | "MEDIUM" | "HIGH" {
  const present = ["productType", "quantity", "email", "phone", "deliveryCountry", "deadline"].filter(
    (key) => extracted[key as keyof WhatsAppAssistantExtracted]
  ).length;
  if (present >= 5) return "HIGH";
  if (present >= 3) return "MEDIUM";
  return "LOW";
}

function buildFallbackAnalysis(input: WhatsAppAssistantInput, warning?: string): WhatsAppAssistantAnalysis {
  const extracted = extractFallback(input);
  const missingInfo = missingFromExtracted(extracted);
  const product = extracted.productType || "sản phẩm may mặc/OEM";
  const quantity = extracted.quantity || "chưa rõ số lượng";
  const followUp = missingInfo.slice(0, 5);

  return {
    summaryVi: `Khách đang hỏi về ${product}, ${quantity}. Cần xác nhận thêm các thông tin kỹ thuật và giao hàng trước khi báo giá.`,
    customerIntent: "Customer is asking for garment/OEM production support and likely needs pricing or feasibility confirmation.",
    detectedLanguage: detectLanguage(input.rawChatText),
    leadQuality: scoreLead(extracted),
    extracted,
    missingInfo,
    suggestedNextActionVi: "Phản hồi bằng tiếng Anh để xác nhận đã nhận yêu cầu, sau đó hỏi ngắn gọn các thông tin còn thiếu trước khi chuyển bước báo giá.",
    replyOptions: [
      {
        label: "Hỏi thêm thông tin",
        message: `Hi, thank you for your message. We can help review this ${product} request. To prepare an accurate quotation, could you please share the quantity, fabric/GSM, colors, size breakdown, logo/artwork details, delivery country, and target deadline?`,
      },
      {
        label: "Xác nhận đã nhận thông tin",
        message: "Hi, thank you for sharing the details. We have received your request and will review the product requirements carefully. If anything is missing, we will come back with a short list of questions before preparing the next step.",
      },
      {
        label: "Từ chối lịch sự nếu chưa phù hợp",
        message: "Hi, thank you for considering us. Based on the current information, we may need a clearer quantity, product specification, and delivery requirement before confirming whether we are the right production partner. Please feel free to share more details and we will review again.",
      },
    ],
    internalNotesVi: `Phân tích dự phòng. Không tự tạo giá, MOQ, lead time hoặc chi phí vận chuyển. Thông tin cần hỏi thêm: ${followUp.join(", ") || "không có mục bắt buộc nổi bật"}.`,
    aiProviderStatus: "FALLBACK",
    adminWarningVi: warning,
  };
}

function normalizeAnalysis(raw: unknown, fallback: WhatsAppAssistantAnalysis): WhatsAppAssistantAnalysis {
  if (!raw || typeof raw !== "object") return fallback;
  const data = raw as Record<string, unknown>;
  const extractedRaw = data.extracted && typeof data.extracted === "object" ? data.extracted as Record<string, unknown> : {};
  const extracted = { ...EMPTY_WHATSAPP_EXTRACTED };
  for (const key of FIELD_KEYS) {
    extracted[key] = asText(extractedRaw[key]);
  }

  const leadQuality = data.leadQuality === "HIGH" || data.leadQuality === "MEDIUM" || data.leadQuality === "LOW"
    ? data.leadQuality
    : fallback.leadQuality;

  const replyOptions = Array.isArray(data.replyOptions)
    ? data.replyOptions.slice(0, 3).map((item, index) => {
        const option = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return {
          label: asText(option.label) || fallback.replyOptions[index]?.label || `Phản hồi ${index + 1}`,
          message: asText(option.message) || fallback.replyOptions[index]?.message || "",
        };
      })
    : fallback.replyOptions;

  return {
    summaryVi: asText(data.summaryVi) || fallback.summaryVi,
    customerIntent: asText(data.customerIntent) || fallback.customerIntent,
    detectedLanguage: asText(data.detectedLanguage) || fallback.detectedLanguage,
    leadQuality,
    extracted,
    missingInfo: Array.isArray(data.missingInfo) ? data.missingInfo.map(asText).filter(Boolean) : missingFromExtracted(extracted),
    suggestedNextActionVi: asText(data.suggestedNextActionVi) || fallback.suggestedNextActionVi,
    replyOptions: replyOptions.length === 3 ? replyOptions : fallback.replyOptions,
    internalNotesVi: asText(data.internalNotesVi) || fallback.internalNotesVi,
    aiProviderStatus: "OPENAI",
  };
}

function buildPrompt(input: WhatsAppAssistantInput): string {
  return JSON.stringify({
    task: "Analyze a pasted WhatsApp conversation from an international garment/OEM lead for Vietnamclothing.vn.",
    sourceWebsite: input.sourceWebsite || "Vietnamclothing.vn",
    optionalFields: {
      customerName: input.customerName || "",
      company: input.company || "",
      email: input.email || "",
      phone: input.phone || "",
    },
    rules: [
      "Return only valid JSON matching the requested shape.",
      "Be conservative. Do not invent price, MOQ, production time, or shipping cost.",
      "Customer-facing reply messages must be natural professional English.",
      "Internal summaries, suggested next action, and notes must be Vietnamese.",
      "Optimize for apparel, uniforms, T-shirts, polos, hoodies, caps, tote bags, promotional products.",
      "Ask concise follow-up questions for missing information.",
    ],
    outputShape: {
      summaryVi: "string",
      customerIntent: "string",
      detectedLanguage: "string",
      leadQuality: "LOW | MEDIUM | HIGH",
      extracted: EMPTY_WHATSAPP_EXTRACTED,
      missingInfo: ["string"],
      suggestedNextActionVi: "string",
      replyOptions: [
        { label: "Hỏi thêm thông tin", message: "English message" },
        { label: "Xác nhận đã nhận thông tin", message: "English message" },
        { label: "Từ chối lịch sự nếu chưa phù hợp", message: "English message" },
      ],
      internalNotesVi: "string",
    },
    rawChatText: input.rawChatText,
  });
}

export async function analyzeWhatsAppChat(input: WhatsAppAssistantInput): Promise<WhatsAppAssistantAnalysis> {
  const fallback = buildFallbackAnalysis(input);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildFallbackAnalysis(
      input,
      "Chưa cấu hình OPENAI_API_KEY. Hệ thống đang dùng phân tích dự phòng, chưa phải kết quả AI đầy đủ."
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a careful B2B garment export sales assistant. Return compact valid JSON only.",
          },
          { role: "user", content: buildPrompt(input) },
        ],
      }),
    });
    const payload = await response.json() as OpenAIChatResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message || "OpenAI request failed");
    }
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned empty content");
    return normalizeAnalysis(JSON.parse(content), fallback);
  } catch (err) {
    console.error("[whatsapp-assistant] analyze failed:", err);
    return {
      ...fallback,
      adminWarningVi: "AI đang tạm thời không khả dụng. Hệ thống đang hiển thị phân tích dự phòng để sales vẫn tiếp tục xử lý được.",
    };
  }
}
