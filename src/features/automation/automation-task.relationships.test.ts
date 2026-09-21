import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyTaskRelationships } from "@/features/automation/automation-task.relationships";
import { automationTaskFixture } from "@/features/automation/automation-task.test-fixtures";

describe("automation task relationships", () => {
  it("marks superseded issue hidden in active when replacement is open", () => {
    const original = automationTaskFixture({
      issueNumber: 85,
      status: "approved",
      statusLabel: "status:approved",
      isOpen: true,
      closedAt: null,
      mergedAt: null,
      recentStatusComments: [],
    });
    const replacement = automationTaskFixture({
      issueNumber: 89,
      title: "Supersedes #85",
      status: "building",
      statusLabel: "status:building",
      isOpen: true,
      closedAt: null,
      mergedAt: null,
      recentStatusComments: [{ author: "owner", body: "supersedes #85", createdAt: "2026-09-21T00:00:00.000Z" }],
    });

    const [originalTask] = applyTaskRelationships([original, replacement]).filter(
      (task) => task.issueNumber === 85,
    );

    assert.equal(originalTask?.relationship.supersededByIssueNumber, 89);
    assert.equal(originalTask?.relationship.isSupersededInActiveView, true);
  });
});
