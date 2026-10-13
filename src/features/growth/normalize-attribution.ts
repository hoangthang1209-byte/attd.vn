import type { LeadSource } from "@prisma/client";
import {
  type MarketingChannelKey,
  isMarketingChannelKey,
} from "@/features/growth/marketing-taxonomy";

const MAX_CAMPAIGN_LEN = 120;

export type AttributionInput = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
  leadSource?: LeadSource | null;
  intakeChannel?: string | null;
  persistedChannel?: string | null;
  persistedCampaign?: string | null;
};

export type NormalizedAttribution = {
  marketingChannel: MarketingChannelKey;
  marketingCampaign: string | null;
};

function clipLower(value: string | null | undefined, max = MAX_CAMPAIGN_LEN): string | null {
  if (!value?.trim()) return null;
  const t = value.trim().toLowerCase().slice(0, max);
  return t || null;
}

function slugCampaign(value: string | null | undefined): string | null {
  const raw = clipLower(value);
  if (!raw) return null;
  const slug = raw
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_CAMPAIGN_LEN);
  return slug || null;
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

function referrerHost(referrer: string | null | undefined): string | null {
  if (!referrer?.trim()) return null;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function classifyFromUtm(source: string, medium: string, campaign: string): MarketingChannelKey | null {
  if (includesAny(medium, ["cpc", "ppc", "paidsearch", "paid-search"]) || includesAny(source, ["google", "adwords", "bing"])) {
    if (includesAny(medium, ["cpc", "ppc", "paid"])) return "PAID_SEARCH";
  }
  if (
    includesAny(source, ["facebook", "fb", "instagram", "ig", "meta"]) &&
    includesAny(medium, ["cpc", "paid", "remarketing", "retargeting"])
  ) {
    return "PAID_SOCIAL";
  }
  if (includesAny(source, ["linkedin", "ln"]) || includesAny(medium, ["linkedin"])) {
    return "LINKEDIN_ABM";
  }
  if (includesAny(medium, ["email", "outbound", "sequence"])) {
    return "OUTBOUND";
  }
  if (includesAny(campaign, ["reactiv", "winback", "dormant", "re-engage"])) {
    return "REACTIVATION";
  }
  if (includesAny(medium, ["referral", "partner", "affiliate"])) {
    return "REFERRAL_PARTNER";
  }
  if (includesAny(medium, ["social", "organic_social"])) {
    return "SOCIAL_ORGANIC";
  }
  if (includesAny(medium, ["organic"]) || (source === "google" && medium === "organic")) {
    return "ORGANIC_SEARCH";
  }
  return null;
}

function classifyFromReferrer(referrer: string | null | undefined): MarketingChannelKey | null {
  const host = referrerHost(referrer);
  if (!host) return null;
  if (includesAny(host, ["google.", "bing.", "coccoc.", "yahoo."])) return "ORGANIC_SEARCH";
  if (includesAny(host, ["facebook.", "instagram.", "tiktok.", "zalo.", "linkedin."])) {
    return "SOCIAL_ORGANIC";
  }
  return null;
}

function classifyFromLeadSource(source: LeadSource | null | undefined): MarketingChannelKey | null {
  switch (source) {
    case "PRODUCT_INQUIRY":
      return "PRODUCT_INQUIRY";
    case "DEALER":
      return "DEALER";
    case "OLD_CUSTOMER":
      return "REACTIVATION";
    case "REFERRAL":
      return "REFERRAL_PARTNER";
    case "EMAIL":
    case "WHATSAPP":
    case "ZALO":
      return "OUTBOUND";
    default:
      return null;
  }
}

function classifyFromIntakeChannel(channel: string | null | undefined): MarketingChannelKey | null {
  if (!channel?.trim()) return null;
  const c = channel.trim().toUpperCase();
  if (c.includes("PRODUCT")) return "PRODUCT_INQUIRY";
  if (c.includes("DEALER")) return "DEALER";
  if (c.includes("REACTIV")) return "REACTIVATION";
  return null;
}

/**
 * Derive stable channel + campaign keys for reporting.
 * Persisted values win when already set (first-touch on Lead).
 */
export function normalizeMarketingAttribution(input: AttributionInput): NormalizedAttribution {
  if (input.persistedChannel && isMarketingChannelKey(input.persistedChannel)) {
    return {
      marketingChannel: input.persistedChannel,
      marketingCampaign: input.persistedCampaign?.trim() || slugCampaign(input.utmCampaign) || null,
    };
  }

  const source = clipLower(input.utmSource) ?? "";
  const medium = clipLower(input.utmMedium) ?? "";
  const campaign = clipLower(input.utmCampaign) ?? "";

  const fromUtm = classifyFromUtm(source, medium, campaign);
  const fromReferrer = classifyFromReferrer(input.referrer);
  const fromLeadSource = classifyFromLeadSource(input.leadSource ?? null);
  const fromIntake = classifyFromIntakeChannel(input.intakeChannel);

  const marketingChannel: MarketingChannelKey =
    fromUtm ??
    fromIntake ??
    fromLeadSource ??
    fromReferrer ??
    (source || medium || campaign ? "OTHER" : "DIRECT");

  return {
    marketingChannel,
    marketingCampaign: slugCampaign(input.utmCampaign),
  };
}

export function mergeLeadAttributionFields(input: {
  existing?: Partial<{
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmTerm: string | null;
    utmContent: string | null;
    referrer: string | null;
    landingPage: string | null;
    marketingChannel: string | null;
    marketingCampaign: string | null;
  }>;
  incoming?: Partial<{
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmTerm?: string | null;
    utmContent?: string | null;
    referrer?: string | null;
    landingPage?: string | null;
  }>;
  leadSource?: LeadSource | null;
  intakeChannel?: string | null;
}): {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPage: string | null;
  marketingChannel: MarketingChannelKey;
  marketingCampaign: string | null;
} {
  const pick = (existing: string | null | undefined, incoming: string | null | undefined) =>
    existing?.trim() || incoming?.trim() || null;

  const utmSource = pick(input.existing?.utmSource, input.incoming?.utmSource);
  const utmMedium = pick(input.existing?.utmMedium, input.incoming?.utmMedium);
  const utmCampaign = pick(input.existing?.utmCampaign, input.incoming?.utmCampaign);
  const utmTerm = pick(input.existing?.utmTerm, input.incoming?.utmTerm);
  const utmContent = pick(input.existing?.utmContent, input.incoming?.utmContent);
  const referrer = pick(input.existing?.referrer, input.incoming?.referrer);
  const landingPage = pick(input.existing?.landingPage, input.incoming?.landingPage);

  const normalized = normalizeMarketingAttribution({
    utmSource,
    utmMedium,
    utmCampaign,
    referrer,
    landingPage,
    leadSource: input.leadSource,
    intakeChannel: input.intakeChannel,
    persistedChannel: input.existing?.marketingChannel,
    persistedCampaign: input.existing?.marketingCampaign,
  });

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    referrer,
    landingPage,
    marketingChannel: normalized.marketingChannel,
    marketingCampaign:
      input.existing?.marketingCampaign?.trim() || normalized.marketingCampaign,
  };
}
