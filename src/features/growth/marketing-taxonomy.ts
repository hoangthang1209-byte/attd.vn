/**
 * Shared Growth Engine channel taxonomy (GROWTH-1).
 * Keys are stable identifiers for reporting; labels are Vietnamese for admin UI.
 */
export const MARKETING_CHANNEL_KEYS = [
  "ORGANIC_SEARCH",
  "PAID_SEARCH",
  "PAID_SOCIAL",
  "SOCIAL_ORGANIC",
  "REFERRAL_PARTNER",
  "OUTBOUND",
  "REACTIVATION",
  "LINKEDIN_ABM",
  "DEALER",
  "PRODUCT_INQUIRY",
  "DIRECT",
  "OTHER",
] as const;

export type MarketingChannelKey = (typeof MARKETING_CHANNEL_KEYS)[number];

export const MARKETING_CHANNEL_LABELS: Record<MarketingChannelKey, string> = {
  ORGANIC_SEARCH: "Tìm kiếm organic",
  PAID_SEARCH: "Quảng cáo tìm kiếm",
  PAID_SOCIAL: "Quảng cáo mạng xã hội",
  SOCIAL_ORGANIC: "Mạng xã hội organic",
  REFERRAL_PARTNER: "Đối tác / giới thiệu",
  OUTBOUND: "Outbound B2B",
  REACTIVATION: "Kích hoạt lại lead/KH",
  LINKEDIN_ABM: "LinkedIn / ABM",
  DEALER: "Kênh đại lý",
  PRODUCT_INQUIRY: "Hỏi giá sản phẩm",
  DIRECT: "Trực tiếp / không UTM",
  OTHER: "Khác",
};

export function isMarketingChannelKey(value: string): value is MarketingChannelKey {
  return (MARKETING_CHANNEL_KEYS as readonly string[]).includes(value);
}

export function marketingChannelLabel(key: string): string {
  return isMarketingChannelKey(key) ? MARKETING_CHANNEL_LABELS[key] : key;
}
