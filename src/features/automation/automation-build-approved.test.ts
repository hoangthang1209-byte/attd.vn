import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BUILD_APPROVED_COMMENT,
  hasBuildApprovedComment,
  isExactBuildApprovedComment,
} from "@/features/automation/automation-build-approved";

describe("automation build approved comment helpers", () => {
  it("matches only the exact BUILD_APPROVED body", () => {
    assert.equal(isExactBuildApprovedComment("BUILD_APPROVED"), true);
    assert.equal(isExactBuildApprovedComment("  BUILD_APPROVED  "), true);
    assert.equal(isExactBuildApprovedComment("BUILD_APPROVED\n"), true);
    assert.equal(isExactBuildApprovedComment("BUILD_APPROVED please"), false);
    assert.equal(isExactBuildApprovedComment("ORCHESTRATOR: BUILD_APPROVED"), false);
    assert.equal(BUILD_APPROVED_COMMENT, "BUILD_APPROVED");
  });

  it("detects an existing exact approval comment", () => {
    assert.equal(
      hasBuildApprovedComment([
        { body: "TASK_AREA: Automation Platform" },
        { body: "BUILD_APPROVED" },
      ]),
      true,
    );
    assert.equal(hasBuildApprovedComment([{ body: "not approved yet" }]), false);
  });
});
