import type { LeadSource } from "@prisma/client";

/** Canonical intake adapter identifiers (hub registry). */
export const LEAD_INTAKE_ADAPTER_KEYS = [
  "website-attd",
  "website-aothun",
  "website-vcn",
  "website-public",
  "gmail",
  "manual-admin",
  "csv-import",
  "webhook-generic",
  "webhook-partner",
] as const;

export type LeadIntakeAdapterKey = (typeof LEAD_INTAKE_ADAPTER_KEYS)[number];

export type LeadIntakeWebsiteSiteKey = "ATTD" | "AOTHUN" | "VCN";

export type LeadIntakeWebsiteSite = {
  key: LeadIntakeWebsiteSiteKey;
  adapterKey: LeadIntakeAdapterKey;
  label: string;
  hostnames: string[];
  defaultSource: LeadSource;
};

export const LEAD_INTAKE_WEBSITE_SITES: Record<LeadIntakeWebsiteSiteKey, LeadIntakeWebsiteSite> = {
  ATTD: {
    key: "ATTD",
    adapterKey: "website-attd",
    label: "attd.vn",
    hostnames: ["attd.vn", "www.attd.vn"],
    defaultSource: "WEBSITE",
  },
  AOTHUN: {
    key: "AOTHUN",
    adapterKey: "website-aothun",
    label: "aothunthongdiep.com",
    hostnames: ["aothunthongdiep.com", "www.aothunthongdiep.com"],
    defaultSource: "WEBSITE",
  },
  VCN: {
    key: "VCN",
    adapterKey: "website-vcn",
    label: "vietnamclothing.vn",
    hostnames: ["vietnamclothing.vn", "www.vietnamclothing.vn"],
    defaultSource: "WEBSITE",
  },
};

export function isLeadIntakeAdapterKey(value: string): value is LeadIntakeAdapterKey {
  return (LEAD_INTAKE_ADAPTER_KEYS as readonly string[]).includes(value);
}

export function resolveWebsiteSiteFromHost(hostname: string | null | undefined): LeadIntakeWebsiteSite | null {
  if (!hostname?.trim()) return null;
  const host = hostname.trim().toLowerCase().replace(/:\d+$/, "");
  for (const site of Object.values(LEAD_INTAKE_WEBSITE_SITES)) {
    if (site.hostnames.includes(host)) return site;
  }
  return null;
}

export function resolveWebsiteSiteKey(
  raw: string | null | undefined
): LeadIntakeWebsiteSiteKey | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim().toUpperCase();
  if (normalized in LEAD_INTAKE_WEBSITE_SITES) {
    return normalized as LeadIntakeWebsiteSiteKey;
  }
  return null;
}

export function getLeadIntakeAdapterLabel(adapterKey: LeadIntakeAdapterKey): string {
  switch (adapterKey) {
    case "website-attd":
      return "Website attd.vn";
    case "website-aothun":
      return "Website aothunthongdiep.com";
    case "website-vcn":
      return "Website vietnamclothing.vn";
    case "website-public":
      return "Website (công khai)";
    case "gmail":
      return "Gmail";
    case "manual-admin":
      return "Tạo thủ công (admin)";
    case "csv-import":
      return "Import CSV";
    case "webhook-generic":
      return "Webhook chung";
    case "webhook-partner":
      return "Webhook đối tác";
    default:
      return adapterKey;
  }
}
