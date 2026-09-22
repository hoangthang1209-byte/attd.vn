export type LinkedPullRequestCandidate = {
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  updatedAt: string;
  eventType: "cross-referenced" | "connected";
  body?: string | null;
  merged?: boolean;
  mergeCommitSha?: string | null;
};

export function issueClosingReferencePattern(issueNumber: number): RegExp {
  return new RegExp(
    `(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s+#${issueNumber}\\b`,
    "i",
  );
}

export function candidateMentionsClosingIssue(
  candidate: { title: string; body?: string | null },
  issueNumber: number,
): boolean {
  const pattern = issueClosingReferencePattern(issueNumber);
  if (pattern.test(candidate.title)) return true;
  return candidate.body ? pattern.test(candidate.body) : false;
}

export function scoreLinkedPullRequestCandidate(
  candidate: LinkedPullRequestCandidate,
  issueNumber: number,
  issueClosedByCommitId: string | null,
): number {
  let score = 0;

  if (
    issueClosedByCommitId &&
    candidate.merged &&
    candidate.mergeCommitSha &&
    candidate.mergeCommitSha === issueClosedByCommitId
  ) {
    score += 10_000;
  }

  if (candidateMentionsClosingIssue(candidate, issueNumber)) {
    score += 5_000;
    if (candidate.merged) score += 500;
  }

  if (candidate.merged) {
    score += 1_000;
  }

  if (candidate.eventType === "connected") {
    score += 100;
  } else {
    score += 50;
  }

  if (candidate.state === "OPEN") {
    score += 10;
  } else {
    score += 20;
  }

  return score;
}

export function selectCanonicalLinkedPullRequestCandidate<
  T extends LinkedPullRequestCandidate,
>(
  candidates: T[],
  issueNumber: number,
  issueClosedByCommitId: string | null,
): T | null {
  if (candidates.length === 0) return null;

  const scored = candidates.map((candidate) => ({
    candidate,
    score: scoreLinkedPullRequestCandidate(candidate, issueNumber, issueClosedByCommitId),
  }));

  scored.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return right.candidate.updatedAt.localeCompare(left.candidate.updatedAt);
  });

  return scored[0]?.candidate ?? null;
}

export function dedupeLinkedPullRequestCandidates<
  T extends LinkedPullRequestCandidate,
>(candidates: T[]): T[] {
  const byNumber = new Map<number, T>();

  for (const candidate of candidates) {
    const existing = byNumber.get(candidate.number);
    if (!existing) {
      byNumber.set(candidate.number, candidate);
      continue;
    }

    const existingScore =
      (existing.eventType === "connected" ? 2 : 1) +
      (existing.state === "CLOSED" ? 1 : 0);
    const candidateScore =
      (candidate.eventType === "connected" ? 2 : 1) +
      (candidate.state === "CLOSED" ? 1 : 0);

    if (
      candidateScore > existingScore ||
      (candidateScore === existingScore &&
        candidate.updatedAt.localeCompare(existing.updatedAt) > 0)
    ) {
      byNumber.set(candidate.number, candidate);
    }
  }

  return [...byNumber.values()];
}

export function extractIssueClosedByCommitId(
  timeline: ReadonlyArray<{ event: string; commit_id?: string | null }>,
): string | null {
  for (const event of timeline) {
    if (event.event !== "closed") continue;
    const commitId = event.commit_id?.trim();
    if (commitId) return commitId;
  }
  return null;
}
