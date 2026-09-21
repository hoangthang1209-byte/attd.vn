/** Closed merged/superseded history window for date-bounded search. */
export const HISTORICAL_MERGED_LOOKBACK_DAYS = 30;

export const HISTORICAL_AUTOMATION_STATUS_LABELS = ["status:merged", "status:superseded"] as const;

function formatClosedSinceDate(lookbackDays: number, now = new Date()): string {
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - lookbackDays);
  return since.toISOString().slice(0, 10);
}

function joinLabelDisjunction(labels: readonly string[]): string {
  return labels.map((label) => `label:"${label}"`).join(" OR ");
}

/** Builds the fixed small set of Search API queries used on cache miss. */
export function buildAutomationSearchQueries(
  owner: string,
  repo: string,
  statusLabels: readonly string[],
  now = new Date(),
): string[] {
  const openLabels = statusLabels.filter(
    (label) => !(HISTORICAL_AUTOMATION_STATUS_LABELS as readonly string[]).includes(label),
  );
  const closedSince = formatClosedSinceDate(HISTORICAL_MERGED_LOOKBACK_DAYS, now);

  return [
    `repo:${owner}/${repo} is:issue is:open (${joinLabelDisjunction(openLabels)})`,
    `repo:${owner}/${repo} is:issue is:closed (${joinLabelDisjunction([...HISTORICAL_AUTOMATION_STATUS_LABELS])}) closed:>=${closedSince}`,
  ];
}
