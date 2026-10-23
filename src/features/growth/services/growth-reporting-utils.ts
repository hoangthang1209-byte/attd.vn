import type { ReportRangePreset } from "@/features/crm/reporting.types";
import {
  parseCrmReportFilters,
  toRangeLabel,
} from "@/features/crm/services/crm-reporting-utils";
import type { GrowthReportFilters } from "@/features/growth/growth-dashboard.types";

type InputParams = URLSearchParams | Record<string, string | null | undefined>;

function getParam(input: InputParams, key: string): string | null {
  if (input instanceof URLSearchParams) return input.get(key);
  const value = input[key];
  return typeof value === "string" ? value : null;
}

export function parseGrowthReportFilters(input: InputParams): GrowthReportFilters {
  const crm = parseCrmReportFilters(input);
  const marketingChannel = getParam(input, "marketingChannel")?.trim() || null;
  return {
    preset: crm.preset as ReportRangePreset,
    from: crm.from,
    to: crm.to,
    rangeLabel: toRangeLabel(crm),
    marketingChannel,
  };
}
