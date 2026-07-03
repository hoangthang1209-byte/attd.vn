export const WHATSAPP_ASSISTANT_MAX_CHAT_LENGTH = 20000;

export type WhatsAppLeadQuality = "LOW" | "MEDIUM" | "HIGH";

export type WhatsAppAssistantInput = {
  rawChatText: string;
  sourceWebsite?: string;
  customerName?: string;
  company?: string;
  email?: string;
  phone?: string;
};

export type WhatsAppAssistantExtracted = {
  customerName: string;
  companyName: string;
  country: string;
  email: string;
  phone: string;
  productType: string;
  quantity: string;
  fabric: string;
  gsm: string;
  color: string;
  sizeBreakdown: string;
  logoOrDesign: string;
  decorationMethod: string;
  packaging: string;
  deliveryCountry: string;
  deadline: string;
  incoterm: string;
  budgetTarget: string;
};

export type WhatsAppAssistantReplyOption = {
  label: string;
  message: string;
};

export type WhatsAppAssistantAnalysis = {
  summaryVi: string;
  customerIntent: string;
  detectedLanguage: string;
  leadQuality: WhatsAppLeadQuality;
  extracted: WhatsAppAssistantExtracted;
  missingInfo: string[];
  suggestedNextActionVi: string;
  replyOptions: WhatsAppAssistantReplyOption[];
  internalNotesVi: string;
  aiProviderStatus?: "OPENAI" | "FALLBACK";
  adminWarningVi?: string;
};

export const EMPTY_WHATSAPP_EXTRACTED: WhatsAppAssistantExtracted = {
  customerName: "",
  companyName: "",
  country: "",
  email: "",
  phone: "",
  productType: "",
  quantity: "",
  fabric: "",
  gsm: "",
  color: "",
  sizeBreakdown: "",
  logoOrDesign: "",
  decorationMethod: "",
  packaging: "",
  deliveryCountry: "",
  deadline: "",
  incoterm: "",
  budgetTarget: "",
};

export const WHATSAPP_EXTRACTED_LABELS: Record<keyof WhatsAppAssistantExtracted, string> = {
  customerName: "Tên khách hàng",
  companyName: "Công ty",
  country: "Quốc gia",
  email: "Email",
  phone: "WhatsApp / Phone",
  productType: "Loại sản phẩm",
  quantity: "Số lượng",
  fabric: "Chất liệu",
  gsm: "GSM",
  color: "Màu sắc",
  sizeBreakdown: "Size breakdown",
  logoOrDesign: "Logo / thiết kế",
  decorationMethod: "Phương pháp in/thêu",
  packaging: "Đóng gói",
  deliveryCountry: "Nước giao hàng",
  deadline: "Deadline",
  incoterm: "Incoterm",
  budgetTarget: "Ngân sách mục tiêu",
};
