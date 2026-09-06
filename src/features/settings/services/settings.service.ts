import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { companyInfo as staticCompanyInfo } from "@/lib/companyInfo";
import {
  PUBLIC_CACHE_REVALIDATE_SECONDS,
  PUBLIC_CACHE_TAGS,
} from "@/lib/public-cache-tags";

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

async function loadCompanySettings(): Promise<CompanyInfoData> {
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

/** Uncached — Admin settings and mutation read-your-writes. */
export async function getCompanySettings(): Promise<CompanyInfoData> {
  return loadCompanySettings();
}

/** Tagged cache for public footer / JSON-LD (invalidated on company save). */
export async function getCachedCompanySettings(): Promise<CompanyInfoData> {
  return unstable_cache(loadCompanySettings, ["public-company-settings"], {
    tags: [PUBLIC_CACHE_TAGS.company],
    revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  })();
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
  try {
    await seedBrandingSettings();
  } catch (err) {
    console.error("[settings.service] seedBrandingSettings skipped:", err);
  }
}

export type BrandingSettingsData = {
  headerLogoUrl: string | null;
  footerLogoUrl: string | null;
  faviconUrl: string | null;
  defaultOgImageUrl: string | null;
  companyTagline: string;
  facebookUrl: string | null;
  zaloUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  linkedinUrl: string | null;
};

export type BrandingSettingsRecord = BrandingSettingsData;

const staticBranding: BrandingSettingsData = {
  headerLogoUrl: null,
  footerLogoUrl: null,
  faviconUrl: null,
  defaultOgImageUrl: null,
  companyTagline: staticCompanyInfo.tagline,
  facebookUrl: null,
  zaloUrl: null,
  youtubeUrl: null,
  tiktokUrl: null,
  linkedinUrl: null,
};

function mapDbToBranding(row: {
  headerLogoUrl: string | null;
  footerLogoUrl: string | null;
  faviconUrl: string | null;
  defaultOgImageUrl: string | null;
  companyTagline: string;
  facebookUrl: string | null;
  zaloUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  linkedinUrl: string | null;
}): BrandingSettingsData {
  return {
    headerLogoUrl: row.headerLogoUrl,
    footerLogoUrl: row.footerLogoUrl,
    faviconUrl: row.faviconUrl,
    defaultOgImageUrl: row.defaultOgImageUrl,
    companyTagline: row.companyTagline.trim() || staticCompanyInfo.tagline,
    facebookUrl: row.facebookUrl,
    zaloUrl: row.zaloUrl,
    youtubeUrl: row.youtubeUrl,
    tiktokUrl: row.tiktokUrl,
    linkedinUrl: row.linkedinUrl,
  };
}

async function loadBrandingSettings(): Promise<BrandingSettingsData> {
  try {
    const row = await prisma.brandingSettings.findUnique({
      where: { id: "default" },
    });
    if (row) return mapDbToBranding(row);
  } catch {
    // DB unavailable or table missing — fall back to static config
  }
  return staticBranding;
}

export async function getBrandingSettings(): Promise<BrandingSettingsData> {
  return unstable_cache(loadBrandingSettings, ["public-branding-settings"], {
    tags: [PUBLIC_CACHE_TAGS.branding],
    revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  })();
}

export async function isBrandingTableReady(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'BrandingSettings'
      ) AS "exists"
    `;
    return rows[0]?.exists === true;
  } catch {
    return false;
  }
}

export async function getBrandingSettingsRecord(): Promise<BrandingSettingsRecord | null> {
  try {
    if (!(await isBrandingTableReady())) return null;
    const row = await prisma.brandingSettings.findUnique({
      where: { id: "default" },
    });
    if (!row) return null;
    return mapDbToBranding(row);
  } catch {
    return null;
  }
}

export async function upsertBrandingSettings(data: {
  headerLogoUrl?: string | null;
  footerLogoUrl?: string | null;
  faviconUrl?: string | null;
  defaultOgImageUrl?: string | null;
  companyTagline?: string;
  facebookUrl?: string | null;
  zaloUrl?: string | null;
  youtubeUrl?: string | null;
  tiktokUrl?: string | null;
  linkedinUrl?: string | null;
}): Promise<BrandingSettingsRecord | null> {
  try {
    if (!(await isBrandingTableReady())) return null;
    const row = await prisma.brandingSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });
    return mapDbToBranding(row);
  } catch (err) {
    console.error("[settings.service] upsertBrandingSettings failed:", err);
    return null;
  }
}

export async function seedBrandingSettings(): Promise<boolean> {
  const result = await upsertBrandingSettings({
    companyTagline: staticCompanyInfo.tagline,
    headerLogoUrl: null,
    footerLogoUrl: null,
    faviconUrl: null,
    defaultOgImageUrl: null,
    facebookUrl: null,
    zaloUrl: null,
    youtubeUrl: null,
    tiktokUrl: null,
    linkedinUrl: null,
  });
  return result != null;
}

export type BrandingAdminInitial = BrandingSettingsData & {
  facebookUrl: string;
  zaloUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  linkedinUrl: string;
};

function toBrandingAdminInitial(source: BrandingSettingsData): BrandingAdminInitial {
  return {
    ...source,
    facebookUrl: source.facebookUrl ?? "",
    zaloUrl: source.zaloUrl ?? "",
    youtubeUrl: source.youtubeUrl ?? "",
    tiktokUrl: source.tiktokUrl ?? "",
    linkedinUrl: source.linkedinUrl ?? "",
  };
}

export async function loadBrandingAdminInitial(): Promise<{
  tableReady: boolean;
  initial: BrandingAdminInitial;
}> {
  const tableReady = await isBrandingTableReady();

  if (!tableReady) {
    return {
      tableReady: false,
      initial: toBrandingAdminInitial(await getBrandingSettings()),
    };
  }

  let record = await getBrandingSettingsRecord();
  if (!record) {
    await seedBrandingSettings();
    record = await getBrandingSettingsRecord();
  }

  return {
    tableReady: true,
    initial: toBrandingAdminInitial(record ?? (await getBrandingSettings())),
  };
}
