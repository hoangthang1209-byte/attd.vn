import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDashboardFetchSequencer } from "@/features/automation/automation-dashboard-fetch";

describe("automation dashboard fetch sequencer", () => {
  it("allows foreground requests while background is in flight", () => {
    const sequencer = createDashboardFetchSequencer();
    const background = sequencer.beginRequest("active", "background");
    assert.ok(background);

    const foreground = sequencer.beginRequest("all", "foreground");
    assert.ok(foreground);
    assert.notEqual(background?.requestId, foreground?.requestId);
  });

  it("skips overlapping background refreshes", () => {
    const sequencer = createDashboardFetchSequencer();
    const first = sequencer.beginRequest("active", "background");
    const second = sequencer.beginRequest("active", "background");

    assert.ok(first);
    assert.equal(second, null);
  });

  it("drops stale foreground responses after a newer foreground request", () => {
    const sequencer = createDashboardFetchSequencer();
    const first = sequencer.beginRequest("active", "foreground");
    const second = sequencer.beginRequest("all", "foreground");

    assert.ok(first);
    assert.ok(second);

    assert.equal(sequencer.shouldApplyResponse(first!, "active"), false);
    assert.equal(sequencer.shouldApplyResponse(second!, "all"), true);
  });

  it("does not drop in-flight foreground responses when a background refresh starts later", () => {
    const sequencer = createDashboardFetchSequencer();
    const foreground = sequencer.beginRequest("all", "foreground");
    const background = sequencer.beginRequest("active", "background");

    assert.ok(foreground);
    assert.ok(background);

    assert.equal(sequencer.shouldApplyResponse(foreground!, "all"), true);
  });

  it("applies active background refresh for lane cache even on other tabs", () => {
    const sequencer = createDashboardFetchSequencer();
    const background = sequencer.beginRequest("active", "background");
    assert.ok(background);

    assert.equal(sequencer.shouldApplyResponse(background!, "completed"), false);
    assert.equal(sequencer.shouldApplyActiveLaneResponse(background!), true);
  });

  it("drops background list refresh when the user switched away from that view", () => {
    const sequencer = createDashboardFetchSequencer();
    const background = sequencer.beginRequest("all", "background");
    assert.ok(background);

    assert.equal(sequencer.shouldApplyResponse(background!, "active"), false);
  });

  it("drops stale background list refresh after a newer foreground request", () => {
    const sequencer = createDashboardFetchSequencer();
    const background = sequencer.beginRequest("all", "background");
    sequencer.beginRequest("completed", "foreground");

    assert.ok(background);
    assert.equal(sequencer.shouldApplyResponse(background!, "all"), false);
  });

  it("keeps active lane cache authoritative after a newer foreground tab switch", () => {
    const sequencer = createDashboardFetchSequencer();
    const background = sequencer.beginRequest("active", "background");
    sequencer.beginRequest("completed", "foreground");

    assert.ok(background);
    assert.equal(sequencer.shouldApplyResponse(background!, "completed"), false);
    assert.equal(sequencer.shouldApplyActiveLaneResponse(background!), true);
  });

  it("drops stale active lane cache after a newer active-target request", () => {
    const sequencer = createDashboardFetchSequencer();
    const first = sequencer.beginRequest("active", "background");
    const second = sequencer.beginRequest("active", "background", { preemptActiveBackground: true });

    assert.ok(first);
    assert.ok(second);

    assert.equal(sequencer.shouldApplyActiveLaneResponse(first!), false);
    assert.equal(sequencer.shouldApplyActiveLaneResponse(second!), true);
  });

  it("allows preempting an in-flight active background refresh", () => {
    const sequencer = createDashboardFetchSequencer();
    const first = sequencer.beginRequest("active", "background");
    const blocked = sequencer.beginRequest("active", "background");
    const preempted = sequencer.beginRequest("active", "background", { preemptActiveBackground: true });

    assert.ok(first);
    assert.equal(blocked, null);
    assert.ok(preempted);
  });

  it("tracks latest foreground request for loading state cleanup", () => {
    const sequencer = createDashboardFetchSequencer();
    const first = sequencer.beginRequest("active", "foreground");
    const second = sequencer.beginRequest("all", "foreground");

    assert.ok(first);
    assert.ok(second);

    assert.equal(sequencer.isLatestForegroundRequest(first!), false);
    assert.equal(sequencer.isLatestForegroundRequest(second!), true);
  });
});
