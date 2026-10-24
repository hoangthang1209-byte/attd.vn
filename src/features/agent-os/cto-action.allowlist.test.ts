import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCtoAllowedAction,
  isCtoAllowedAction,
  isCtoExternalWriteAction,
} from "@/features/agent-os/cto-action.allowlist";

describe("CTO action allowlist", () => {
  it("accepts known actions and rejects unknown", () => {
    assert.equal(isCtoAllowedAction("ASSIGN_AGENT"), true);
    assert.equal(isCtoAllowedAction("RUN_SHELL"), false);
    assert.throws(() => assertCtoAllowedAction("RUN_SHELL"));
  });

  it("marks external write actions", () => {
    assert.equal(isCtoExternalWriteAction("POST_BUILD_APPROVED"), true);
    assert.equal(isCtoExternalWriteAction("ASSIGN_AGENT"), false);
  });
});
