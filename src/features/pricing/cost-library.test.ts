import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COST_LIBRARY_CATEGORY_LABELS,
  costLibraryCategoryToComponentType,
  isCostLibraryCategory,
  normalizeCostLibraryName,
} from "@/features/pricing/cost-library";
import { costingComponentTypeLabel } from "@/features/pricing/costing-component-labels";
import { findBuiltinCostLibraryItem } from "@/features/pricing/services/cost-library.service";

describe("cost library helpers", () => {
  it("normalizes names for duplicate detection", () => {
    assert.equal(normalizeCostLibraryName("  Ủi  "), normalizeCostLibraryName("ủi"));
  });

  it("finds builtin duplicate by normalized name and category", () => {
    const match = findBuiltinCostLibraryItem("wash", "OTHER");
    assert.equal(match?.name, "Wash");
  });

  it("accepts FINISHING as a system cost library category", () => {
    assert.equal(isCostLibraryCategory("FINISHING"), true);
    assert.equal(COST_LIBRARY_CATEGORY_LABELS.FINISHING, "Hoàn thiện");
    assert.equal(costLibraryCategoryToComponentType("FINISHING", "Ủi"), "FINISHING");
    assert.equal(costingComponentTypeLabel("FINISHING"), "Hoàn thiện");
  });

  it("keeps OTHER and existing categories unchanged", () => {
    assert.equal(isCostLibraryCategory("OTHER"), true);
    assert.equal(isCostLibraryCategory("PACKAGING"), true);
    assert.equal(isCostLibraryCategory("INVALID"), false);
    assert.equal(findBuiltinCostLibraryItem("QC", "OTHER")?.name, "QC");
  });
});
