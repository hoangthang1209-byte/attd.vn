import { NextRequest, NextResponse } from "next/server";
import { createLeadFromWhatsAppAssistant } from "@/features/crm/whatsapp-assistant/lead";
import {
  EMPTY_WHATSAPP_EXTRACTED,
  WHATSAPP_ASSISTANT_MAX_CHAT_LENGTH,
  type WhatsAppAssistantAnalysis,
  type WhatsAppAssistantInput,
  type WhatsAppAssistantReplyOption,
} from "@/features/crm/whatsapp-assistant/types";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

function readString(raw: Record<string, unknown>, key: string): string {
  return typeof raw[key] === "string" ? raw[key].trim() : "";
}

function parseAnalysis(raw: unknown): WhatsAppAssistantAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const extractedRaw = data.extracted && typeof data.extracted === "object"
    ? data.extracted as Record<string, unknown>
    : {};
  const extracted = { ...EMPTY_WHATSAPP_EXTRACTED };
  for (const key of Object.keys(extracted) as Array<keyof typeof extracted>) {
    extracted[key] = typeof extractedRaw[key] === "string" ? extractedRaw[key].trim() : "";
  }

  const leadQuality = data.leadQuality === "HIGH" || data.leadQuality === "MEDIUM" || data.leadQuality === "LOW"
    ? data.leadQuality
    : "MEDIUM";

  return {
    summaryVi: typeof data.summaryVi === "string" ? data.summaryVi.trim() : "",
    customerIntent: typeof data.customerIntent === "string" ? data.customerIntent.trim() : "",
    detectedLanguage: typeof data.detectedLanguage === "string" ? data.detectedLanguage.trim() : "",
    leadQuality,
    extracted,
    missingInfo: Array.isArray(data.missingInfo)
      ? data.missingInfo.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
      : [],
    suggestedNextActionVi: typeof data.suggestedNextActionVi === "string" ? data.suggestedNextActionVi.trim() : "",
    replyOptions: Array.isArray(data.replyOptions)
      ? data.replyOptions.map((item): WhatsAppAssistantReplyOption => {
          const option = item && typeof item === "object" ? item as Record<string, unknown> : {};
          return {
            label: typeof option.label === "string" ? option.label.trim() : "",
            message: typeof option.message === "string" ? option.message.trim() : "",
          };
        })
      : [],
    internalNotesVi: typeof data.internalNotesVi === "string" ? data.internalNotesVi.trim() : "",
    aiProviderStatus: data.aiProviderStatus === "OPENAI" || data.aiProviderStatus === "FALLBACK" ? data.aiProviderStatus : undefined,
    adminWarningVi: typeof data.adminWarningVi === "string" ? data.adminWarningVi.trim() : undefined,
  };
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "JSON không hợp lệ." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Thiếu dữ liệu tạo lead." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const rawChatText = readString(raw, "rawChatText");
  const analysis = parseAnalysis(raw.analysis);

  if (!rawChatText) {
    return NextResponse.json({ message: "Vui lòng dán nội dung chat WhatsApp." }, { status: 400 });
  }

  if (rawChatText.length > WHATSAPP_ASSISTANT_MAX_CHAT_LENGTH) {
    return NextResponse.json(
      { message: `Nội dung chat quá dài. Vui lòng rút gọn dưới ${WHATSAPP_ASSISTANT_MAX_CHAT_LENGTH} ký tự.` },
      { status: 400 }
    );
  }

  if (!analysis?.summaryVi) {
    return NextResponse.json({ message: "Vui lòng phân tích AI trước khi tạo Lead CRM." }, { status: 400 });
  }

  const input: WhatsAppAssistantInput = {
    rawChatText,
    sourceWebsite: readString(raw, "sourceWebsite") || "Vietnamclothing.vn",
    customerName: readString(raw, "customerName"),
    company: readString(raw, "company"),
    email: readString(raw, "email"),
    phone: readString(raw, "phone"),
  };

  const lead = await createLeadFromWhatsAppAssistant(input, analysis);
  if (!lead) {
    return NextResponse.json(
      { message: "Không thể tạo Lead CRM. Vui lòng kiểm tra dữ liệu liên hệ hoặc migration CRM." },
      { status: 500 }
    );
  }

  return NextResponse.json({ lead }, { status: 201 });
}
