/** Trust metrics — DB via settings service; static fallback in trustData helpers. */

import type { TrustMetricsData } from "@/features/settings/services/settings.service";

export type TrustMetricKey =
  | "clientsCount"
  | "partnerCount"
  | "provinceCount"
  | "experienceYears";

/** @deprecated Static fallback — use getTrustMetricsSettings() from DB */
export const TRUST_METRICS = {
  clientsCount: null as number | null,
  partnerCount: null as number | null,
  provinceCount: null as number | null,
  experienceYears: null as number | null,
} as const;

export const TRUST_SECTION = {
  title: "Tại sao đại lý và doanh nghiệp chọn ATTD?",
} as const;

const METRIC_LABELS: Record<TrustMetricKey, string> = {
  clientsCount: "Khách hàng",
  partnerCount: "Đối tác",
  provinceCount: "Tỉnh thành",
  experienceYears: "Năm kinh nghiệm",
};

function formatMetricValue(key: TrustMetricKey, value: number): string {
  if (key === "provinceCount") return String(value);
  return `${value}+`;
}

export type TrustMetricDisplay = {
  key: TrustMetricKey;
  value: string;
  label: string;
};

export function getVisibleTrustMetricsFromData(
  data: TrustMetricsData
): TrustMetricDisplay[] {
  const result: TrustMetricDisplay[] = [];
  const keys: TrustMetricKey[] = [
    "clientsCount",
    "partnerCount",
    "provinceCount",
    "experienceYears",
  ];

  for (const key of keys) {
    const raw = data[key];
    if (raw == null || raw <= 0) continue;
    result.push({
      key,
      value: formatMetricValue(key, raw),
      label: METRIC_LABELS[key],
    });
  }

  return result;
}

/** @deprecated Use getVisibleTrustMetricsFromData with DB settings */
export function getVisibleTrustMetrics(): TrustMetricDisplay[] {
  return getVisibleTrustMetricsFromData({
    ...TRUST_METRICS,
    sectionTitle: TRUST_SECTION.title,
  });
}

export function hasVisibleTrustMetrics(): boolean {
  return getVisibleTrustMetrics().length > 0;
}

export function countConfiguredTrustMetrics(): number {
  return (Object.keys(TRUST_METRICS) as TrustMetricKey[]).filter(
    (key) => TRUST_METRICS[key] != null && TRUST_METRICS[key]! > 0
  ).length;
}

export const TRUST_METRIC_TOTAL = 4;
