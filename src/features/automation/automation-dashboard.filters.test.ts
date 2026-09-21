import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectTaskAreaFilterOptions,
  matchesAutomationTaskFilters,
} from "@/features/automation/automation-dashboard.filters";
import { automationTaskFixture } from "@/features/automation/automation-task.test-fixtures";

describe("automation dashboard filters", () => {
  it("filters tasks by task area", () => {
    const leadTask = automationTaskFixture({ issueNumber: 71, taskArea: "Lead & Sales" });
    const uiTask = automationTaskFixture({ issueNumber: 74, taskArea: "Public Website UI" });

    assert.equal(
      matchesAutomationTaskFilters(leadTask, {
        statusFilter: "all",
        riskFilter: "all",
        openFilter: "all",
        taskAreaFilter: "Lead & Sales",
        searchQuery: "",
      }),
      true,
    );
    assert.equal(
      matchesAutomationTaskFilters(uiTask, {
        statusFilter: "all",
        riskFilter: "all",
        openFilter: "all",
        taskAreaFilter: "Lead & Sales",
        searchQuery: "",
      }),
      false,
    );
  });

  it("includes task area in search matching", () => {
    assert.equal(
      matchesAutomationTaskFilters(automationTaskFixture(), {
        statusFilter: "all",
        riskFilter: "all",
        openFilter: "all",
        taskAreaFilter: "all",
        searchQuery: "automation platform",
      }),
      true,
    );
  });

  it("collects sorted unique task area filter options", () => {
    const options = collectTaskAreaFilterOptions([
      automationTaskFixture({ taskArea: "Automation Platform" }),
      automationTaskFixture({ issueNumber: 71, taskArea: "Lead & Sales" }),
      automationTaskFixture({ issueNumber: 74, taskArea: "Public Website UI" }),
      automationTaskFixture({ issueNumber: 75, taskArea: "Lead & Sales" }),
    ]);

    assert.deepEqual(options, [
      { value: "Automation Platform", label: "Automation Platform" },
      { value: "Lead & Sales", label: "Lead & Sales" },
      { value: "Public Website UI", label: "Public Website UI" },
    ]);
  });
});
