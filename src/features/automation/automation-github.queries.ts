/** Closed merged/superseded history window for date-bounded search. */
export const HISTORICAL_MERGED_LOOKBACK_DAYS = 30;

export const HISTORICAL_AUTOMATION_STATUS_LABELS = ["status:merged", "status:superseded"] as const;

function formatClosedSinceDate(lookbackDays: number, now = new Date()): string {
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - lookbackDays);
  return since.toISOString().slice(0, 10);
}

type LabeledItem = { labels: Array<{ name: string }> };

/** True when an issue carries at least one label from the allowed set. */
export function hasAnyAutomationStatusLabel(
  item: LabeledItem,
  allowedLabels: readonly string[],
): boolean {
  const allowed = new Set<string>(allowedLabels);
  return item.labels.some((label) => allowed.has(label.name));
}

/** Builds the fixed small set of Search API queries used on cache miss. */
export function buildAutomationSearchQueries(
  owner: string,
  repo: string,
  _statusLabels: readonly string[],
  now = new Date(),
): string[] {
  const closedSince = formatClosedSinceDate(HISTORICAL_MERGED_LOOKBACK_DAYS, now);

  return [
    `repo:${owner}/${repo} is:issue is:open`,
    `repo:${owner}/${repo} is:issue is:closed closed:>=${closedSince}`,
  ];
}
