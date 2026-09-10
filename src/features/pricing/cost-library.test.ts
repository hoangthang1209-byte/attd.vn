import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BUILTIN_COST_LIBRARY,
  COST_LIBRARY_CATEGORY_LABELS,
  costLibraryCategoryToComponentType,
  costLibraryItemMatchesTokens,
  findBuiltinCostLibraryById,
  isCostLibraryCategory,
  mergeCostLibraryCatalog,
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

  it("merges builtins with DB rows without duplicating sew-basic", () => {
    const sew = findBuiltinCostLibraryById("sew-basic");
    assert.ok(sew);
    const promoted = {
      ...sew,
      id: "db-cuid-sew",
      legacyBuiltinId: "sew-basic",
    };
    const merged = mergeCostLibraryCatalog([promoted], BUILTIN_COST_LIBRARY);
    assert.equal(merged.filter((item) => item.name === sew.name).length, 1);
    assert.equal(merged.find((item) => item.name === sew.name)?.id, "db-cuid-sew");
    assert.equal(merged.some((item) => item.id === "sew-basic"), false);
  });

  it("matches service search tokens against names like may / in lua / theu", () => {
    const sew = findBuiltinCostLibraryById("sew-basic");
    const print = findBuiltinCostLibraryById("print-silk-1c");
    const emb = findBuiltinCostLibraryById("emb-standard");
    assert.ok(sew && print && emb);
    assert.equal(costLibraryItemMatchesTokens(sew, ["may"]), true);
    assert.equal(costLibraryItemMatchesTokens(print, ["in", "lụa"]), true);
    assert.equal(costLibraryItemMatchesTokens(emb, ["thêu"]), true);
    assert.equal(costLibraryItemMatchesTokens(sew, ["in", "lụa"]), false);
  });
});
