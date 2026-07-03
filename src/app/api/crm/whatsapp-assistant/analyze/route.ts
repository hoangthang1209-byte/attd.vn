import { NextRequest, NextResponse } from "next/server";
import { analyzeWhatsAppChat } from "@/features/crm/whatsapp-assistant/analysis";
import {
  WHATSAPP_ASSISTANT_MAX_CHAT_LENGTH,
  type WhatsAppAssistantInput,
} from "@/features/crm/whatsapp-assistant/types";

function readString(raw: Record<string, unknown>, key: string): string {
  return typeof raw[key] === "string" ? raw[key].trim() : "";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "JSON không hợp lệ." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Thiếu dữ liệu phân tích." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const rawChatText = readString(raw, "rawChatText");

  if (!rawChatText) {
    return NextResponse.json({ message: "Vui lòng dán nội dung chat WhatsApp." }, { status: 400 });
  }

  if (rawChatText.length > WHATSAPP_ASSISTANT_MAX_CHAT_LENGTH) {
    return NextResponse.json(
      { message: `Nội dung chat quá dài. Vui lòng rút gọn dưới ${WHATSAPP_ASSISTANT_MAX_CHAT_LENGTH} ký tự.` },
      { status: 400 }
    );
  }

  const input: WhatsAppAssistantInput = {
    rawChatText,
    sourceWebsite: readString(raw, "sourceWebsite") || "Vietnamclothing.vn",
    customerName: readString(raw, "customerName"),
    company: readString(raw, "company"),
    email: readString(raw, "email"),
    phone: readString(raw, "phone"),
  };

  const analysis = await analyzeWhatsAppChat(input);
  return NextResponse.json(analysis);
}
