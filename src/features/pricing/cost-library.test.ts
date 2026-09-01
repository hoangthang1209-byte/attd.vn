import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCostLibraryName } from "@/features/pricing/cost-library";
import { findBuiltinCostLibraryItem } from "@/features/pricing/services/cost-library.service";

describe("cost library helpers", () => {
  it("normalizes names for duplicate detection", () => {
    assert.equal(normalizeCostLibraryName("  Ủi  "), normalizeCostLibraryName("ủi"));
  });

  it("finds builtin duplicate by normalized name and category", () => {
    const match = findBuiltinCostLibraryItem("wash", "OTHER");
    assert.equal(match?.name, "Wash");
  });
});
