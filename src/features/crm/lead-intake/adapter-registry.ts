import type { LeadInboundAdapter } from "@/features/crm/lead-intake/adapter.types";
import { gmailInboundAdapter } from "@/features/crm/lead-intake/adapters/gmail.adapter";
import {
  webhookGenericAdapter,
  webhookPartnerAdapter,
  type GenericWebhookLeadPayload,
} from "@/features/crm/lead-intake/adapters/webhook-generic.adapter";
import {
  websiteAothunAdapter,
  websiteAttdAdapter,
  websiteVcnAdapter,
  type PublicWebsiteLeadPayload,
} from "@/features/crm/lead-intake/adapters/website.adapter";
import {
  isLeadIntakeAdapterKey,
  type LeadIntakeAdapterKey,
} from "@/features/crm/lead-intake/taxonomy";

const WEBHOOK_ADAPTERS: Record<string, LeadInboundAdapter<GenericWebhookLeadPayload>> = {
  "webhook-generic": webhookGenericAdapter,
  "webhook-partner": webhookPartnerAdapter,
};

const WEBSITE_ADAPTERS: Record<string, LeadInboundAdapter<PublicWebsiteLeadPayload>> = {
  "website-attd": websiteAttdAdapter,
  "website-aothun": websiteAothunAdapter,
  "website-vcn": websiteVcnAdapter,
};

export function resolveRegisteredLeadIntakeAdapter(
  adapterKey: string
): LeadInboundAdapter<unknown> | null {
  if (!isLeadIntakeAdapterKey(adapterKey)) return null;

  if (adapterKey === "gmail") {
    return gmailInboundAdapter as LeadInboundAdapter<unknown>;
  }

  const webhook = WEBHOOK_ADAPTERS[adapterKey];
  if (webhook) return webhook as LeadInboundAdapter<unknown>;

  const website = WEBSITE_ADAPTERS[adapterKey];
  if (website) return website as LeadInboundAdapter<unknown>;

  return null;
}

export function listWebhookAdapterKeys(): LeadIntakeAdapterKey[] {
  return ["webhook-generic", "webhook-partner"];
}
