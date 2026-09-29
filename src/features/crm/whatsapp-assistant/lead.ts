import "server-only";
import { createHash } from "node:crypto";
import type { LeadPriority } from "@prisma/client";
import { createCRMActivity } from "@/features/crm/services/crm-activity.service";
import { intakeLead } from "@/features/crm/services/lead-intake.service";
import type { CrmLeadRecord } from "@/features/crm/types";
import type {
  WhatsAppAssistantAnalysis,
  WhatsAppAssistantExtracted,
  WhatsAppAssistantInput,
} from "@/features/crm/whatsapp-assistant/types";

function parseQuantity(value: string): number | null {
  if (!value.trim()) return null;
  const normalized = value.replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function priorityFromQuality(quality: WhatsAppAssistantAnalysis["leadQuality"]): LeadPriority {
  if (quality === "HIGH") return "HIGH";
  if (quality === "LOW") return "LOW";
  return "NORMAL";
}

function compactExtracted(extracted: WhatsAppAssistantExtracted): string {
  return Object.entries(extracted)
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function buildLeadNote(input: WhatsAppAssistantInput, analysis: WhatsAppAssistantAnalysis): string {
  return [
    "Nguồn: Vietnamclothing.vn / WhatsApp",
    input.sourceWebsite ? `Website: ${input.sourceWebsite}` : null,
    "",
    "Tóm tắt AI:",
    analysis.summaryVi,
    "",
    "Thông tin trích xuất:",
    compactExtracted(analysis.extracted) || "Chưa có thông tin trích xuất rõ ràng.",
    "",
    "Thông tin còn thiếu:",
    analysis.missingInfo.length ? analysis.missingInfo.map((item) => `- ${item}`).join("\n") : "Không có.",
    "",
    "Gợi ý bước tiếp theo:",
    analysis.suggestedNextActionVi,
    "",
    "Raw WhatsApp chat:",
    input.rawChatText,
    "",
    "JSON phân tích:",
    JSON.stringify(analysis, null, 2),
  ]
    .filter((item) => item !== null)
    .join("\n");
}

function buildDemand(analysis: WhatsAppAssistantAnalysis): string {
  const extracted = analysis.extracted;
  return [
    analysis.summaryVi,
    extracted.productType ? `Sản phẩm: ${extracted.productType}` : null,
    extracted.quantity ? `Số lượng: ${extracted.quantity}` : null,
    extracted.fabric ? `Chất liệu: ${extracted.fabric}` : null,
    extracted.gsm ? `GSM: ${extracted.gsm}` : null,
    extracted.color ? `Màu: ${extracted.color}` : null,
    extracted.deliveryCountry ? `Giao đến: ${extracted.deliveryCountry}` : null,
    extracted.deadline ? `Deadline: ${extracted.deadline}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildWhatsAppSourceRef(rawChatText: string): string {
  const digest = createHash("sha256").update(rawChatText.trim()).digest("hex").slice(0, 64);
  return `wa:${digest}`;
}

export async function createLeadFromWhatsAppAssistant(
  input: WhatsAppAssistantInput,
  analysis: WhatsAppAssistantAnalysis
): Promise<CrmLeadRecord | null> {
  const extracted = analysis.extracted;
  const contactName = input.customerName?.trim() || extracted.customerName || null;
  const companyName = input.company?.trim() || extracted.companyName || null;
  const phone = input.phone?.trim() || extracted.phone || undefined;
  const email = input.email?.trim() || extracted.email || null;
  const note = buildLeadNote(input, analysis);

  const result = await intakeLead({
    channel: "OTHER",
    source: "OTHER",
    sourceRef: buildWhatsAppSourceRef(input.rawChatText),
    sourceDetail: "Vietnamclothing.vn / WhatsApp",
    contactName,
    companyName,
    phone,
    email,
    demand: buildDemand(analysis),
    note,
    priority: priorityFromQuality(analysis.leadQuality),
    intakeMetadata: {
      whatsappAssistant: true,
      sourceWebsite: input.sourceWebsite ?? null,
      leadQuality: analysis.leadQuality,
    },
    productInterests: [
      {
        productNameSnapshot: extracted.productType || "WhatsApp garment inquiry",
        quantity: parseQuantity(extracted.quantity),
        unit: "cái",
        requirementNote: compactExtracted(extracted) || analysis.summaryVi,
        serviceNeeds: {
          oem: true,
          export: true,
          whatsappAssistant: true,
        },
      },
    ],
  });

  if (!result) return null;

  if (result.created) {
    await createCRMActivity({
      leadId: result.lead.id,
      type: "NOTE",
      title: "WhatsApp AI - phân tích lead",
      content: note,
      outcome: analysis.suggestedNextActionVi,
    });
  }

  return result.lead;
}
