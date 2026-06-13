import { prisma } from "@/lib/prisma";
import { companyInfo as staticCompanyInfo } from "@/lib/companyInfo";

export type CompanyInfoData = {
  name: string;
  legalName: string;
  tagline: string;
  hotline: { raw: string; display: string; international: string };
  zalo: { phone: string; url: string };
  email: string;
  address: string;
  taxCode: string;
  workingHours: string;
};

function formatInternational(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("84")) return `+${digits}`;
  if (digits.startsWith("0")) return `+84${digits.slice(1)}`;
  return `+84${digits}`;
}

function mapDbToCompanyInfo(row: {
  brandName: string;
  legalName: string;
  tagline: string;
  hotlineRaw: string;
  hotlineDisplay: string;
  zaloPhone: string;
  zaloUrl: string;
  email: string;
  address: string;
  taxCode: string;
  workingHours: string;
}): CompanyInfoData {
  return {
    name: row.brandName,
    legalName: row.legalName,
    tagline: row.tagline,
    hotline: {
      raw: row.hotlineRaw,
      display: row.hotlineDisplay,
      international: formatInternational(row.hotlineRaw),
    },
    zalo: { phone: row.zaloPhone, url: row.zaloUrl },
    email: row.email,
    address: row.address,
    taxCode: row.taxCode,
    workingHours: row.workingHours,
  };
}

export async function getCompanySettings(): Promise<CompanyInfoData> {
  try {
    const row = await prisma.companySettings.findUnique({
      where: { id: "default" },
    });
    if (row) return mapDbToCompanyInfo(row);
  } catch {
    // DB unavailable — fall back to static config
  }
  return staticCompanyInfo as CompanyInfoData;
}

export async function upsertCompanySettings(data: {
  brandName: string;
  legalName: string;
  tagline: string;
  hotlineRaw: string;
  hotlineDisplay: string;
  zaloPhone: string;
  zaloUrl: string;
  email: string;
  address: string;
  taxCode: string;
  workingHours: string;
}) {
  return prisma.companySettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });
}

export type TrustMetricsData = {
  clientsCount: number | null;
  partnerCount: number | null;
  provinceCount: number | null;
  experienceYears: number | null;
  sectionTitle: string;
};

const staticTrust: TrustMetricsData = {
  clientsCount: null,
  partnerCount: null,
  provinceCount: null,
  experienceYears: null,
  sectionTitle: "Tại sao đại lý và doanh nghiệp chọn ATTD?",
};

export async function getTrustMetricsSettings(): Promise<TrustMetricsData> {
  try {
    const row = await prisma.trustMetricsSettings.findUnique({
      where: { id: "default" },
    });
    if (row) {
      return {
        clientsCount: row.clientsCount,
        partnerCount: row.partnerCount,
        provinceCount: row.provinceCount,
        experienceYears: row.experienceYears,
        sectionTitle: row.sectionTitle,
      };
    }
  } catch {
    // fallback
  }
  return staticTrust;
}

export async function upsertTrustMetricsSettings(data: TrustMetricsData) {
  return prisma.trustMetricsSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });
}

export async function seedDefaultSettings() {
  await upsertCompanySettings({
    brandName: staticCompanyInfo.name,
    legalName: staticCompanyInfo.legalName,
    tagline: staticCompanyInfo.tagline,
    hotlineRaw: staticCompanyInfo.hotline.raw,
    hotlineDisplay: staticCompanyInfo.hotline.display,
    zaloPhone: staticCompanyInfo.zalo.phone,
    zaloUrl: staticCompanyInfo.zalo.url,
    email: staticCompanyInfo.email,
    address: staticCompanyInfo.address,
    taxCode: staticCompanyInfo.taxCode,
    workingHours: staticCompanyInfo.workingHours,
  });
  await upsertTrustMetricsSettings(staticTrust);
}
