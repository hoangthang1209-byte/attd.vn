import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { loadAgentRunPanelData } from "@/components/admin/automation/automation-agent-run-panel.load";

const sampleRuns = {
  issueNumber: 208,
  runs: [
    {
      id: "run-1",
      attemptNumber: 1,
      agentId: "ATTD_CTO",
      status: "SUCCEEDED" as const,
      blockerReason: null,
      nextAction: null,
      lastEvent: null,
      humanApprovalRequired: false,
      humanApprovalReceivedAt: null,
    },
  ],
  currentRun: null,
};

describe("loadAgentRunPanelData", () => {
  test("returns G2 data when G3 fetch fails", async () => {
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/agent-runs")) {
        return new Response(JSON.stringify(sampleRuns), { status: 200 });
      }
      if (url.includes("/cto-loop")) {
        return new Response(JSON.stringify({ message: "G3 unavailable" }), { status: 503 });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    const loaded = await loadAgentRunPanelData(208, fetchImpl);

    assert.equal(loaded.g2Error, null);
    assert.ok(loaded.data);
    assert.equal(loaded.data?.runs.length, 1);
    assert.equal(loaded.ctoLoop, null);
    assert.match(loaded.ctoLoopError ?? "", /G3 unavailable|Không thể tải CTO loop/);
  });

  test("returns G3 warning without clearing G2 when G3 rejects at network layer", async () => {
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/agent-runs")) {
        return new Response(JSON.stringify(sampleRuns), { status: 200 });
      }
      throw new Error("network reset");
    }) as typeof fetch;

    const loaded = await loadAgentRunPanelData(208, fetchImpl);

    assert.equal(loaded.g2Error, null);
    assert.equal(loaded.data?.runs[0]?.id, "run-1");
    assert.equal(loaded.ctoLoop, null);
    assert.equal(loaded.ctoLoopError, "network reset");
  });

  test("surfaces G2 error while still attempting G3 independently", async () => {
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/agent-runs")) {
        return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });
      }
      return new Response(JSON.stringify({ visibility: null }), { status: 200 });
    }) as typeof fetch;

    const loaded = await loadAgentRunPanelData(208, fetchImpl);

    assert.equal(loaded.data, null);
    assert.match(loaded.g2Error ?? "", /Forbidden|Không thể tải agent run/);
    assert.equal(loaded.ctoLoop, null);
    assert.equal(loaded.ctoLoopError, null);
  });
});
