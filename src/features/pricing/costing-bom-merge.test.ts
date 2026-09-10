import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBomMergeToast, mergeBomCostLines } from "@/features/pricing/costing-bom-merge";
import { previewCostingCalculation } from "@/features/pricing/costing-preview";
import {
  costLinesFromBomItems,
  finalizeStructuredLine,
  newCostingLineKey,
  projectLegacyInputToCostLines,
} from "@/features/pricing/costing-v2";
import type { CostingComponentType, CostingStructuredLine } from "@/features/pricing/costing-types";

function processLine(
  label: string,
  unitPrice: number,
  extra: Partial<CostingStructuredLine> = {},
): CostingStructuredLine {
  return finalizeStructuredLine(
    {
      key: extra.key ?? newCostingLineKey(),
      section: "PROCESS",
      componentType: extra.componentType ?? "SEWING",
      origin: extra.origin ?? "CUSTOM",
      pricingBasis: extra.pricingBasis ?? "PER_ITEM",
      label,
      sourceType: extra.sourceType ?? "CUSTOM",
      sourceId: extra.sourceId,
      sourcePriceId: extra.sourcePriceId,
      supplierId: extra.supplierId,
      supplierName: extra.supplierName,
      unitPrice,
      unit: "cái",
      calculationType: extra.calculationType ?? "PER_ITEM",
      quantityFactor: extra.quantityFactor ?? 1,
      isOverride: extra.isOverride,
      note: extra.note,
      referenceUnitPrice: extra.referenceUnitPrice,
      ...extra,
    },
    500,
  );
}

function bomProcesses(
  items: Array<{ label: string; type: CostingComponentType; unitCost: number }>,
): CostingStructuredLine[] {
  return costLinesFromBomItems(items, { quantity: 500 }).filter((row) => row.section === "PROCESS");
}

describe("Costing BOM merge", () => {
  it("adds missing BOM rows and does not duplicate matching process labels", () => {
    const existing = [processLine("May", 20000, { componentType: "SEWING" }), processLine("In", 7000, { componentType: "PRINTING" })];
    const incoming = bomProcesses([
      { label: "Cắt", type: "CUTTING", unitCost: 1000 },
      { label: "May", type: "SEWING", unitCost: 20000 },
      { label: "In", type: "PRINTING", unitCost: 9000 },
      { label: "Đóng gói", type: "PACKAGING", unitCost: 1000 },
    ]);
    const first = mergeBomCostLines(existing, incoming);
    assert.equal(first.added, 2);
    assert.equal(first.skipped, 2);
    const labels = first.lines.filter((row) => row.section === "PROCESS").map((row) => row.label);
    assert.deepEqual(labels, ["May", "In", "Cắt", "Đóng gói"]);
    const may = first.lines.find((row) => row.label === "May");
    assert.equal(may?.unitPrice, 20000);
    const preview = previewCostingCalculation({
      workspaceVersion: 2,
      quantity: 500,
      targetMarginRate: 30,
      costLines: first.lines,
    });
    assert.equal(preview.processCostPerUnit, 29000);
  });

  it("reapplying the same BOM adds zero duplicate rows", () => {
    const incoming = bomProcesses([
      { label: "Cắt", type: "CUTTING", unitCost: 1000 },
      { label: "May", type: "SEWING", unitCost: 20000 },
      { label: "In", type: "PRINTING", unitCost: 7000 },
      { label: "Đóng gói", type: "PACKAGING", unitCost: 1000 },
    ]);
    const first = mergeBomCostLines([], incoming);
    const second = mergeBomCostLines(first.lines, incoming);
    assert.equal(second.added, 0);
    assert.equal(second.skipped, incoming.length);
    assert.equal(second.lines.length, first.lines.length);
    assert.equal(formatBomMergeToast(second.added, second.skipped), `Đã thêm 0 hạng mục, bỏ qua ${incoming.length} hạng mục đã có`);
  });

  it("Hoodie BOM fills only missing processes without identical duplicates", () => {
    const existing = [
      processLine("May", 20000, { componentType: "SEWING" }),
      processLine("Thêu", 8000, { componentType: "EMBROIDERY" }),
      processLine("Ủi", 1000, { componentType: "FINISHING" }),
    ];
    const incoming = bomProcesses([
      { label: "Cắt", type: "CUTTING", unitCost: 1500 },
      { label: "May", type: "SEWING", unitCost: 22000 },
      { label: "Thêu", type: "EMBROIDERY", unitCost: 8000 },
      { label: "Giặt", type: "WASH", unitCost: 3000 },
      { label: "Ủi", type: "FINISHING", unitCost: 1000 },
      { label: "Đóng gói", type: "PACKAGING", unitCost: 1200 },
    ]);
    const merged = mergeBomCostLines(existing, incoming);
    assert.equal(merged.added, 3);
    assert.equal(merged.skipped, 3);
    assert.deepEqual(
      merged.lines.filter((row) => row.section === "PROCESS").map((row) => row.label),
      ["May", "Thêu", "Ủi", "Cắt", "Giặt", "Đóng gói"],
    );
  });

  it("dedupes by library sourceType + sourceId + provider", () => {
    const existing = [
      processLine("May áo thun cơ bản", 20000, {
        origin: "LIBRARY",
        sourceType: "COST_LIBRARY",
        sourceId: "abc123",
        sourcePriceId: "price-a",
        supplierId: "xuong-a",
        supplierName: "Xưởng A",
      }),
    ];
    const sameSource = processLine("May áo thun cơ bản", 18000, {
      origin: "LIBRARY",
      sourceType: "COST_LIBRARY",
      sourceId: "abc123",
      sourcePriceId: "price-a",
      supplierId: "xuong-a",
      supplierName: "Xưởng A",
    });
    const merged = mergeBomCostLines(existing, [sameSource]);
    assert.equal(merged.added, 0);
    assert.equal(merged.skipped, 1);
    assert.equal(merged.lines[0]?.unitPrice, 20000);
  });

  it("keeps the same service with a different provider as a separate row", () => {
    const existing = [
      processLine("May", 20000, {
        origin: "LIBRARY",
        sourceType: "COST_LIBRARY",
        sourceId: "sew-1",
        sourcePriceId: "price-a",
        supplierId: "xuong-a",
        supplierName: "Xưởng A",
      }),
    ];
    const otherProvider = processLine("May", 18000, {
      origin: "LIBRARY",
      sourceType: "COST_LIBRARY",
      sourceId: "sew-1",
      sourcePriceId: "price-b",
      supplierId: "xuong-b",
      supplierName: "Xưởng B",
    });
    const merged = mergeBomCostLines(existing, [otherProvider]);
    assert.equal(merged.added, 1);
    assert.equal(merged.skipped, 0);
    assert.equal(merged.lines.length, 2);
    assert.deepEqual(
      merged.lines.map((row) => row.supplierName),
      ["Xưởng A", "Xưởng B"],
    );
  });

  it("uses normalized manual identity and keeps May vs May bo cổ separate", () => {
    const existing = [processLine("May", 20000)];
    const same = processLine("  MAY  ", 25000);
    const different = processLine("May bo cổ", 4000);
    const merged = mergeBomCostLines(existing, [same, different]);
    assert.equal(merged.added, 1);
    assert.equal(merged.skipped, 1);
    assert.equal(merged.lines.some((row) => row.label === "May bo cổ"), true);
    assert.equal(merged.lines.find((row) => row.label === "May")?.unitPrice, 20000);
  });

  it("does not overwrite an overridden matching row with BOM defaults", () => {
    const existing = [
      processLine("May", 25000, {
        origin: "LIBRARY",
        sourceType: "COST_LIBRARY",
        sourceId: "sew-1",
        sourcePriceId: "price-a",
        supplierId: "xuong-a",
        isOverride: true,
        referenceUnitPrice: 20000,
        note: "điều chỉnh tay",
      }),
    ];
    const bomDefault = processLine("May", 20000, {
      origin: "LIBRARY",
      sourceType: "COST_LIBRARY",
      sourceId: "sew-1",
      sourcePriceId: "price-a",
      supplierId: "xuong-a",
    });
    const merged = mergeBomCostLines(existing, [bomDefault]);
    assert.equal(merged.added, 0);
    assert.equal(merged.lines[0]?.unitPrice, 25000);
    assert.equal(merged.lines[0]?.isOverride, true);
    assert.equal(merged.lines[0]?.note, "điều chỉnh tay");
  });

  it("does not strip historical / legacy projected process rows", () => {
    const legacy = projectLegacyInputToCostLines({
      quantity: 200,
      fabricPrice: 130000,
      fabricConsumption: 3,
      components: [
        { label: "Cắt", type: "CUTTING", unitCost: 1000 },
        { label: "May", type: "SEWING", unitCost: 20000 },
        { label: "In", type: "PRINTING", unitCost: 9000 },
        { label: "Đóng gói + bao bì, thùng", type: "PACKAGING", unitCost: 1000 },
      ],
    });
    assert.equal(legacy.filter((row) => row.section === "PROCESS").length, 4);
    const merged = mergeBomCostLines(legacy, []);
    assert.equal(merged.lines.length, legacy.length);
    assert.deepEqual(
      merged.lines.filter((row) => row.section === "PROCESS").map((row) => row.label),
      ["Cắt", "May", "In", "Đóng gói + bao bì, thùng"],
    );
  });

  it("does not double-count process subtotal after merge", () => {
    const existing = [
      processLine("May", 20000, { componentType: "SEWING" }),
      processLine("In lụa", 7000, { componentType: "PRINTING" }),
    ];
    const incoming = bomProcesses([
      { label: "Cắt", type: "CUTTING", unitCost: 1000 },
      { label: "May", type: "SEWING", unitCost: 20000 },
      { label: "In lụa", type: "PRINTING", unitCost: 7000 },
      { label: "Đóng gói", type: "PACKAGING", unitCost: 1000 },
    ]);
    const merged = mergeBomCostLines(existing, incoming);
    const preview = previewCostingCalculation({
      workspaceVersion: 2,
      quantity: 500,
      targetMarginRate: 30,
      costLines: merged.lines,
    });
    assert.equal(merged.lines.filter((row) => row.section === "PROCESS").length, 4);
    assert.equal(preview.processCostPerUnit, 29000);
  });
});
