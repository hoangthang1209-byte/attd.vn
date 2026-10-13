import type { LeadSource } from "@prisma/client";
import type { CreateCrmLeadInput } from "@/features/crm/types";
import { mergeLeadAttributionFields } from "@/features/growth/normalize-attribution";

export function buildPersistedLeadAttribution(
  input: CreateCrmLeadInput,
  options?: { intakeChannel?: string; existing?: Parameters<typeof mergeLeadAttributionFields>[0]["existing"] },
) {
  return mergeLeadAttributionFields({
    existing: options?.existing,
    incoming: {
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmTerm: input.utmTerm,
      utmContent: input.utmContent,
      referrer: input.referrer,
      landingPage: input.landingPage,
    },
    leadSource: (input.source ?? "WEBSITE") as LeadSource,
    intakeChannel: options?.intakeChannel,
  });
}
