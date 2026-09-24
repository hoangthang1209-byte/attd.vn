import type { LeadSource } from "@prisma/client";
import type { CreateProductInterestInput } from "@/features/crm/types";
import type { LeadInboundAdapter } from "@/features/crm/lead-intake/adapter.types";
import {
  LEAD_INTAKE_WEBSITE_SITES,
  type LeadIntakeWebsiteSite,
  type LeadIntakeWebsiteSiteKey,
} from "@/features/crm/lead-intake/taxonomy";
import { sanitizeSourceRef } from "@/features/crm/lead-intake.utils";
import { LeadIntakeValidationError } from "@/features/crm/lead-intake.types";

export type WebsiteProductInquiryPayload = {
  productId?: string | null;
  productName?: string | null;
  productUrl?: string | null;
  variantId?: string | null;
  variantLabel?: string | null;
  optionSelections?: Record<string, string | null> | null;
  moq?: number | null;
  leadTime?: string | null;
  quantity?: string | null;
  note?: string | null;
};

export type PublicWebsiteLeadPayload = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  message?: string | null;
  submissionId?: string | null;
  siteKey?: string | null;
  landingPage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  productInquiry?: WebsiteProductInquiryPayload | null;
};

function parseQuantity(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const n = parseInt(value.replace(/[,\s]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function buildRequirementNote(inquiry: WebsiteProductInquiryPayload): string | null {
  const lines: string[] = [];
  if (inquiry.productUrl?.trim()) lines.push(`URL: ${inquiry.productUrl.trim()}`);
  if (inquiry.variantLabel?.trim()) lines.push(`Biến thể: ${inquiry.variantLabel.trim()}`);
  if (inquiry.optionSelections) {
    const options = Object.entries(inquiry.optionSelections)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${value}`);
    if (options.length) lines.push(`Tùy chọn: ${options.join(", ")}`);
  }
  if (inquiry.moq != null) lines.push(`MOQ tham chiếu: ${inquiry.moq}`);
  if (inquiry.leadTime?.trim()) lines.push(`Lead time: ${inquiry.leadTime.trim()}`);
  if (inquiry.note?.trim()) {
    lines.push("---");
    lines.push(inquiry.note.trim());
  }
  return lines.length ? lines.join("\n") : null;
}

function resolveSite(
  payload: PublicWebsiteLeadPayload,
  fallbackSite: LeadIntakeWebsiteSite | null
): LeadIntakeWebsiteSite {
  const fromKey = payload.siteKey?.trim();
  if (fromKey) {
    const normalized = fromKey.toUpperCase() as LeadIntakeWebsiteSiteKey;
    if (LEAD_INTAKE_WEBSITE_SITES[normalized]) {
      return LEAD_INTAKE_WEBSITE_SITES[normalized];
    }
  }
  if (fallbackSite) return fallbackSite;
  return LEAD_INTAKE_WEBSITE_SITES.ATTD;
}

function resolveWebsiteLeadSource(
  inquiry: WebsiteProductInquiryPayload | null | undefined,
  site: LeadIntakeWebsiteSite
): LeadSource {
  if (inquiry?.productId) return "PRODUCT_INQUIRY";
  return site.defaultSource === "WEBSITE" ? "CONTACT" : site.defaultSource;
}

export function normalizePublicWebsiteLead(
  payload: PublicWebsiteLeadPayload,
  options: { fallbackSite?: LeadIntakeWebsiteSite | null } = {}
) {
  if (!payload.name?.trim()) {
    throw new LeadIntakeValidationError("Họ tên là bắt buộc");
  }
  if (!payload.phone?.trim()) {
    throw new LeadIntakeValidationError("Số điện thoại là bắt buộc");
  }

  const site = resolveSite(payload, options.fallbackSite ?? null);
  const inquiry = payload.productInquiry ?? undefined;
  const source = resolveWebsiteLeadSource(inquiry, site);

  let productInterest: CreateProductInterestInput | undefined;
  if (inquiry?.productId) {
    productInterest = {
      productId: inquiry.productId,
      variantId: inquiry.variantId ?? null,
      productNameSnapshot: inquiry.productName ?? inquiry.variantLabel ?? null,
      quantity: parseQuantity(inquiry.quantity),
      requirementNote: buildRequirementNote(inquiry),
    };
  }

  const submissionRef = sanitizeSourceRef(payload.submissionId);

  return {
    channel: "WEBSITE" as const,
    source,
    sourceRef: submissionRef,
    sourceDetail: inquiry?.productUrl?.trim() || site.label,
    fullName: payload.name.trim(),
    phone: payload.phone.trim(),
    email: payload.email?.trim() || null,
    companyName: payload.company?.trim() || null,
    message: payload.message?.trim() || null,
    landingPage: payload.landingPage?.trim() || null,
    utmSource: payload.utmSource?.trim() || null,
    utmMedium: payload.utmMedium?.trim() || null,
    utmCampaign: payload.utmCampaign?.trim() || null,
    referrer: payload.referrer?.trim() || null,
    intakeMetadata: {
      siteKey: site.key,
      adapterKey: site.adapterKey,
    },
    ...(productInterest ? { productInterest } : {}),
    site,
  };
}

export function createWebsiteInboundAdapter(
  site: LeadIntakeWebsiteSite
): LeadInboundAdapter<PublicWebsiteLeadPayload> {
  return {
    adapterKey: site.adapterKey,
    normalizeInboundLead(payload, context) {
      const normalized = normalizePublicWebsiteLead(payload, { fallbackSite: site });
      const { site: _site, ...input } = normalized;
      return {
        ...input,
        receivedAt: context.receivedAt ?? new Date(),
      };
    },
  };
}

export const websiteAttdAdapter = createWebsiteInboundAdapter(LEAD_INTAKE_WEBSITE_SITES.ATTD);
export const websiteAothunAdapter = createWebsiteInboundAdapter(LEAD_INTAKE_WEBSITE_SITES.AOTHUN);
export const websiteVcnAdapter = createWebsiteInboundAdapter(LEAD_INTAKE_WEBSITE_SITES.VCN);
