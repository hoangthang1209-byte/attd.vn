import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAutomationDashboardView } from "@/features/automation/automation-dashboard-view-parser";

describe("parseAutomationDashboardView", () => {
  it("defaults to active for missing or invalid values", () => {
    assert.equal(parseAutomationDashboardView(null), "active");
    assert.equal(parseAutomationDashboardView(undefined), "active");
    assert.equal(parseAutomationDashboardView("invalid"), "active");
  });

  it("accepts supported view values", () => {
    assert.equal(parseAutomationDashboardView("all"), "all");
    assert.equal(parseAutomationDashboardView("completed"), "completed");
    assert.equal(parseAutomationDashboardView("active"), "active");
  });
});
