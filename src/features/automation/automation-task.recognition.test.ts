import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEVELOPMENT_TASK_GITHUB_LABEL,
  hasDevelopmentTaskLabel,
  hasRecognizedAutomationStatusLabel,
  hasTaskAreaMarker,
  isRecognizedDevelopmentTask,
} from "@/features/automation/automation-task.recognition";

describe("automation task recognition", () => {
  it("recognizes issues with automation status labels", () => {
    assert.equal(
      isRecognizedDevelopmentTask({
        labels: [{ name: "status:building" }],
      }),
      true,
    );
    assert.equal(hasRecognizedAutomationStatusLabel(["status:merged"]), true);
  });

  it("recognizes issues with the reserved development-task label", () => {
    assert.equal(
      isRecognizedDevelopmentTask({
        labels: [DEVELOPMENT_TASK_GITHUB_LABEL],
      }),
      true,
    );
    assert.equal(hasDevelopmentTaskLabel([DEVELOPMENT_TASK_GITHUB_LABEL]), true);
  });

  it("recognizes issues with TASK_AREA comments and no status label", () => {
    assert.equal(
      hasTaskAreaMarker([{ body: "TASK_AREA: Automation Platform" }]),
      true,
    );
    assert.equal(
      isRecognizedDevelopmentTask({
        labels: ["enhancement"],
        comments: [{ body: "TASK_AREA: Lead & Sales" }],
      }),
      true,
    );
  });

  it("excludes unrelated GitHub issues without task markers", () => {
    assert.equal(
      isRecognizedDevelopmentTask({
        labels: ["bug", "enhancement"],
        comments: [{ body: "Please fix this unrelated issue." }],
      }),
      false,
    );
  });
});
