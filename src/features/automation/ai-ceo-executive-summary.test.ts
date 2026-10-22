import assert from "node:assert/strict";
import test from "node:test";
import { deriveAiCeoExecutiveSummary } from "./ai-ceo-executive-summary";

const mk = (status: string, extra: Record<string, unknown> = {}) => ({
  status, isOpen: true, hasBuildApproved: false,
  latestUpdateAt: "2026-10-22T08:00:00Z", ...extra,
});

test("disjoint CEO counters preserve task total", () => {
  const tasks = [
    mk("building"), mk("queued"), mk("blocked"), mk("failed"),
    mk("merged", { isOpen: false }), mk("backlog"), mk("unknown"),
  ];
  const s = deriveAiCeoExecutiveSummary(tasks as never, { date: "2026-10-22" });
  assert.equal(s.total, 7);
  assert.equal(s.today, 7);
  assert.equal(s.inProgress, 2);
  assert.equal(s.blocked, 2);
  assert.equal(s.completed, 1);
  assert.equal(s.needsApproval, 1);
  assert.equal(s.unknown, 1);
});

test("approval and missing source are not silently treated as completion", () => {
  const s = deriveAiCeoExecutiveSummary([mk("backlog", { hasBuildApproved: true })] as never,
    { date: "2026-10-23", incompleteSource: true });
  assert.equal(s.completed, 0);
  assert.equal(s.needsApproval, 0);
  assert.equal(s.unknown, 1);
  assert.equal(s.today, 0);
  assert.equal(s.incompleteSource, true);
});

test("does not mutate task input", () => {
  const input = Object.freeze([Object.freeze(mk("ci_review"))]);
  assert.equal(deriveAiCeoExecutiveSummary(input as never, { date: "2026-10-22" }).inProgress, 1);
});

test("superseded work does not inflate completion KPI", () => {
  const result = deriveAiCeoExecutiveSummary([
    mk("superseded", { isOpen: false }), mk("merged", { isOpen: false }),
  ] as never, { date: "2026-10-22" });
  assert.equal(result.completed, 1);
  assert.equal(result.unknown, 1);
});
