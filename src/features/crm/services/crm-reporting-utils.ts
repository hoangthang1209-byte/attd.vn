import type { CustomerLegacyType, LeadStatus } from "@prisma/client";
import type { CrmReportFilters, ReportRangePreset } from "@/features/crm/reporting.types";

type InputParams = URLSearchParams | Record<string, string | null | undefined>;

function getParam(input: InputParams, key: string): string | null {
  if (input instanceof URLSearchParams) return input.get(key);
  const value = input[key];
  return typeof value === "string" ? value : null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endExclusiveDay(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

export function resolveDateRange(
  preset: ReportRangePreset,
  now = new Date(),
  fromRaw?: string | null,
  toRaw?: string | null,
): { from: Date; to: Date; rangeLabel: string } {
  const todayStart = startOfDay(now);
  switch (preset) {
    case "today":
      return { from: todayStart, to: endExclusiveDay(todayStart), rangeLabel: "Hôm nay" };
    case "7d":
      return {
        from: startOfDay(new Date(todayStart.getTime() - 6 * 24 * 3600 * 1000)),
        to: endExclusiveDay(todayStart),
        rangeLabel: "7 ngày",
      };
    case "30d":
      return {
        from: startOfDay(new Date(todayStart.getTime() - 29 * 24 * 3600 * 1000)),
        to: endExclusiveDay(todayStart),
        rangeLabel: "30 ngày",
      };
    case "this_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        rangeLabel: "Tháng này",
      };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 1),
        rangeLabel: "Tháng trước",
      };
    case "this_quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      const startMonth = quarter * 3;
      return {
        from: new Date(now.getFullYear(), startMonth, 1),
        to: new Date(now.getFullYear(), startMonth + 3, 1),
        rangeLabel: "Quý này",
      };
    }
    case "custom":
    default: {
      const from = fromRaw ? new Date(fromRaw) : todayStart;
      const to = toRaw ? new Date(toRaw) : todayStart;
      const safeFrom = Number.isNaN(from.getTime()) ? todayStart : startOfDay(from);
      const safeTo = Number.isNaN(to.getTime()) ? todayStart : endExclusiveDay(to);
      return { from: safeFrom, to: safeTo > safeFrom ? safeTo : endExclusiveDay(safeFrom), rangeLabel: "Tùy chọn" };
    }
  }
}

export function parseCrmReportFilters(input: InputParams): CrmReportFilters {
  const presetRaw = getParam(input, "preset");
  const preset: ReportRangePreset =
    presetRaw === "today" ||
    presetRaw === "7d" ||
    presetRaw === "30d" ||
    presetRaw === "this_month" ||
    presetRaw === "last_month" ||
    presetRaw === "this_quarter" ||
    presetRaw === "custom"
      ? presetRaw
      : "30d";

  const range = resolveDateRange(preset, new Date(), getParam(input, "from"), getParam(input, "to"));

  const leadStatusRaw = getParam(input, "leadStatus");
  const leadStatus = (leadStatusRaw || undefined) as LeadStatus | undefined;
  const customerTypeRaw = getParam(input, "customerType");
  const customerType = (customerTypeRaw || undefined) as CustomerLegacyType | undefined;

  return {
    preset,
    from: range.from,
    to: range.to,
    salesOwnerId: getParam(input, "salesOwnerId") || undefined,
    leadSource: getParam(input, "leadSource") || undefined,
    leadStatus,
    customerType,
    revenueCategoryId: getParam(input, "revenueCategoryId") || undefined,
  };
}

export function toRangeLabel(filters: CrmReportFilters): string {
  return resolveDateRange(filters.preset, new Date(), filters.from.toISOString(), filters.to.toISOString()).rangeLabel;
}
