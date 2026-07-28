import type { ContentPerformancePeriod } from "@/features/content/performance/content-performance.types";

export function parsePerformancePeriod(
  searchParams: URLSearchParams,
  now = new Date(),
): {
  period: ContentPerformancePeriod;
  comparisonPeriod: ContentPerformancePeriod | null;
} {
  const range = searchParams.get("range") ?? "28";
  const compare = searchParams.get("compare") !== "0";
  const customFrom = searchParams.get("from");
  const customTo = searchParams.get("to");

  let days = 28;
  let label = "Last 28 days";
  if (range === "7") {
    days = 7;
    label = "Last 7 days";
  } else if (range === "90") {
    days = 90;
    label = "Last 90 days";
  } else if (range === "custom" && customFrom && customTo) {
    const from = new Date(customFrom);
    const to = new Date(customTo);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
      const period = {
        from: from.toISOString(),
        to: to.toISOString(),
        label: "Custom range",
      };
      if (!compare) return { period, comparisonPeriod: null };
      const lengthMs = to.getTime() - from.getTime();
      const prevTo = new Date(from.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - lengthMs);
      return {
        period,
        comparisonPeriod: {
          from: prevFrom.toISOString(),
          to: prevTo.toISOString(),
          label: "Previous equivalent period",
        },
      };
    }
  }

  const to = now;
  const from = new Date(now.getTime() - days * 86_400_000);
  const period = { from: from.toISOString(), to: to.toISOString(), label };
  if (!compare) return { period, comparisonPeriod: null };
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - days * 86_400_000);
  return {
    period,
    comparisonPeriod: {
      from: prevFrom.toISOString(),
      to: prevTo.toISOString(),
      label: "Previous equivalent period",
    },
  };
}
