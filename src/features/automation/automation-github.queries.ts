/** Closed merged/superseded history window for date-bounded search. */
export const HISTORICAL_MERGED_LOOKBACK_DAYS = 30;

export const HISTORICAL_AUTOMATION_STATUS_LABELS = ["status:merged", "status:superseded"] as const;

/** GitHub Search rejects queries with more than five AND / OR / NOT operators. */
export const GITHUB_SEARCH_MAX_BOOLEAN_OPERATORS = 5;

function formatClosedSinceDate(lookbackDays: number, now = new Date()): string {
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - lookbackDays);
  return since.toISOString().slice(0, 10);
}

function joinLabelDisjunction(labels: readonly string[]): string {
  return labels.map((label) => `label:"${label}"`).join(" OR ");
}

function buildOpenOperationalQuery(
  owner: string,
  repo: string,
  labels: readonly string[],
): string {
  return `repo:${owner}/${repo} is:issue is:open (${joinLabelDisjunction(labels)})`;
}

function buildClosedHistoryQuery(
  owner: string,
  repo: string,
  labels: readonly string[],
  closedSince: string,
): string {
  return `repo:${owner}/${repo} is:issue is:closed (${joinLabelDisjunction(labels)}) closed:>=${closedSince}`;
}

/**
 * Counts boolean operators in a GitHub Search query: explicit AND/OR/NOT keywords plus
 * implicit AND between top-level space-separated qualifiers.
 */
export function countGitHubSearchBooleanOperators(query: string): number {
  const explicitOperators = (query.match(/\b(AND|OR|NOT)\b/gi) ?? []).length;

  const topLevelTokens: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of query.trim()) {
    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      current += char;
      continue;
    }
    if (char === " " && depth === 0) {
      if (current.trim()) topLevelTokens.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) topLevelTokens.push(current.trim());

  const implicitAndOperators = topLevelTokens.length > 1 ? topLevelTokens.length - 1 : 0;

  return explicitOperators + implicitAndOperators;
}

function groupLabelsWithinOperatorLimit(
  owner: string,
  repo: string,
  labels: readonly string[],
  buildQuery: (group: readonly string[]) => string,
): string[][] {
  if (labels.length === 0) return [];

  const groups: string[][] = [];
  let currentGroup: string[] = [];

  for (const label of labels) {
    const candidateGroup = [...currentGroup, label];
    const candidateQuery = buildQuery(candidateGroup);

    if (
      countGitHubSearchBooleanOperators(candidateQuery) > GITHUB_SEARCH_MAX_BOOLEAN_OPERATORS
    ) {
      if (currentGroup.length === 0) {
        throw new Error(
          `Automation search query for label "${label}" exceeds GitHub boolean operator limit.`,
        );
      }
      groups.push(currentGroup);
      currentGroup = [label];
      continue;
    }

    currentGroup = candidateGroup;
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
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

  const openLabelGroups = groupLabelsWithinOperatorLimit(owner, repo, openLabels, (group) =>
    buildOpenOperationalQuery(owner, repo, group),
  );

  const openQueries = openLabelGroups.map((group) => buildOpenOperationalQuery(owner, repo, group));
  const closedHistoryQuery = buildClosedHistoryQuery(
    owner,
    repo,
    [...HISTORICAL_AUTOMATION_STATUS_LABELS],
    closedSince,
  );

  return [...openQueries, closedHistoryQuery];
}

/** Returns status labels from the configured list that are absent from generated queries. */
export function findUncoveredAutomationStatusLabels(
  statusLabels: readonly string[],
  queries: readonly string[],
): string[] {
  return statusLabels.filter((label) => {
    const needle = `label:"${label}"`;
    return !queries.some((query) => query.includes(needle));
  });
}
