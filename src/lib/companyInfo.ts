/** Central company information — single source of truth for contact & business data. */

export const companyInfo = {
  name: "ATTD",
  legalName: "",
  tagline: "KHO SỈ ĐỒNG PHỤC & QUÀ TẶNG DOANH NGHIỆP",
  hotline: {
    raw: "0934337667",
    display: "0934 337 667",
    international: "+84934337667",
  },
  zalo: {
    phone: "0934337667",
    url: "https://zalo.me/0934337667",
  },
  email: "contact@attd.vn",
  address: "",
  taxCode: "",
  workingHours: "8:00 – 17:30, Thứ 2 – Thứ 7",
} as const;

export function getHotlineTel(): string {
  return companyInfo.hotline.raw;
}

export function getHotlineDisplay(): string {
  return companyInfo.hotline.display;
}

export function getZaloUrl(): string {
  return companyInfo.zalo.url;
}

export function getEmail(): string {
  return companyInfo.email;
}

export function getCompanyName(): string {
  return companyInfo.name;
}

/** True when a field has real content (non-empty string). */
export function hasCompanyField(value: string | undefined | null): boolean {
  return Boolean(value?.trim());
}
