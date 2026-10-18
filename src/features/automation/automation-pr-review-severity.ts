export type AttdPrReviewSeverityCounts = {
  p0: number;
  p1: number;
  p2: number;
  p3: number;
};

const NO_P0_P1_FINDINGS = /No\s+P0\/P1\s+findings/;

function countFindingsInSection(body: string, severity: "P0" | "P1" | "P2" | "P3"): number {
  const lines = body.split("\n");
  let inSection = false;
  let count = 0;

  for (const line of lines) {
    if (/^####\s+/.test(line)) {
      const sectionRe = new RegExp(`^####\\s*${severity}([^0-9]|$)`);
      if (sectionRe.test(line)) {
        inSection = true;
        continue;
      }
      if (inSection) {
        break;
      }
    }
    if (inSection && /^\*\*[0-9]+\./.test(line)) {
      count += 1;
    }
  }

  if (count > 0) {
    return count;
  }

  const summaryRe = new RegExp(`^[\\s]*-[\\s]*${severity}:[\\s]*(\\d+)`, "m");
  const summaryMatch = body.match(summaryRe);
  if (summaryMatch?.[1]) {
    return Number.parseInt(summaryMatch[1], 10);
  }

  return 0;
}

/** Mirrors `parse_review_severity_counts` in build-orchestrator-common.sh. */
export function parseAttdPrReviewSeverityCounts(body: string): AttdPrReviewSeverityCounts {
  let p0 = 0;
  let p1 = 0;

  if (NO_P0_P1_FINDINGS.test(body)) {
    p0 = 0;
    p1 = 0;
  } else {
    p0 = countFindingsInSection(body, "P0");
    p1 = countFindingsInSection(body, "P1");
  }

  return {
    p0,
    p1,
    p2: countFindingsInSection(body, "P2"),
    p3: countFindingsInSection(body, "P3"),
  };
}

/** Same blocking rule as merge orchestrator (`handle_reviewer_outcome`). */
export function isAttdReviewBlockedByP0P1(body: string): boolean {
  const { p0, p1 } = parseAttdPrReviewSeverityCounts(body);
  return p0 > 0 || p1 > 0;
}

/** Dashboard must not show Review ✅ when merge/repair gate would not advance. */
export function isAttdReviewBlockedForDashboard(body: string): boolean {
  const { p0, p1, p2 } = parseAttdPrReviewSeverityCounts(body);
  return p0 > 0 || p1 > 0 || p2 > 0;
}
