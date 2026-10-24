import assert from "node:assert/strict";
import test from "node:test";
import { deriveLiveBuildMonitor } from "./live-build-monitor";

const task = (status: string, latestUpdateAt: string) => ({
  issueNumber: 219, title: "Agent OS", status, latestUpdateAt, isOpen: true,
  blockerReason: null, linkedPullRequest: null,
});

test("GitHub building activity never asserts a live process without heartbeat", () => {
  const result = deriveLiveBuildMonitor([task("building","2026-10-23T10:00:00Z")] as never, Date.parse("2026-10-23T10:02:00Z"));
  assert.equal(result[0].status, "waiting");
});

test("stale building metadata is flagged for investigation", () => {
  const result = deriveLiveBuildMonitor([task("building","2026-10-23T08:00:00Z")] as never, Date.parse("2026-10-23T10:02:00Z"));
  assert.equal(result[0].status, "stalled");
  assert.match(result[0].reason, /không có hoạt động/);
});

test("blocked issue remains blocked even if recent", () => {
  const result = deriveLiveBuildMonitor([task("blocked","2026-10-23T10:00:00Z")] as never, Date.parse("2026-10-23T10:02:00Z"));
  assert.equal(result[0].status, "blocked");
});
