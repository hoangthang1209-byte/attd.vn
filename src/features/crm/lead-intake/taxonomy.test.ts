import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLeadIntakeAdapterKey,
  resolveWebsiteSiteFromHost,
} from "@/features/crm/lead-intake/taxonomy";

describe("lead intake taxonomy", () => {
  it("recognizes adapter keys", () => {
    assert.equal(isLeadIntakeAdapterKey("website-attd"), true);
    assert.equal(isLeadIntakeAdapterKey("unknown"), false);
  });

  it("resolves website hostnames", () => {
    const site = resolveWebsiteSiteFromHost("www.vietnamclothing.vn");
    assert.equal(site?.key, "VCN");
  });
});
