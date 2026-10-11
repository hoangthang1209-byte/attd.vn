export function parseAgentRunsIssueNumber(raw: string | null): number | null {
  if (!raw) return null;
  const issueNumber = Number.parseInt(raw, 10);
  if (!Number.isFinite(issueNumber) || issueNumber < 1) return null;
  return issueNumber;
}

export function parseAgentRunsLimit(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const limit = Number.parseInt(raw, 10);
  if (!Number.isFinite(limit) || limit < 1) return undefined;
  return limit;
}
