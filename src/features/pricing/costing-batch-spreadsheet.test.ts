import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BIG_BANG_ACCEPTANCE_ROWS,
  buildPersistPayloadFromDraft,
  canPersistSpreadsheetRow,
  computeSpreadsheetLiveRow,
  computeSpreadsheetTotals,
  createEmptyDraftRow,
  hasKnownCostEstimate,
  nextEditableColumn,
  parseIntegerQuantity,
  parseSellingPrice,
  parseSpreadsheetTsv,
  pastedRowToDraft,
} from "@/features/pricing/costing-batch-spreadsheet";

describe("costing batch spreadsheet helpers", () => {
  it("1. draft row does not imply persistence until style + quantity valid", () => {
    const draft = createEmptyDraftRow("d1");
    assert.equal(canPersistSpreadsheetRow(draft), false);
    draft.customProductName = "Tour T-Shirt";
    assert.equal(canPersistSpreadsheetRow(draft), false);
    draft.quantity = "750";
    assert.equal(canPersistSpreadsheetRow(draft), true);
    assert.ok(buildPersistPayloadFromDraft(draft));
  });

  it("11. TSV paste parses multiple rows", () => {
    const text =
      "Sleeveless Top\t270\tT-SHIRTS\t162000\nTour T-Shirt\t750\tT-SHIRTS\t171000\n";
    const rows = parseSpreadsheetTsv(text);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].customProductName, "Sleeveless Top");
    assert.equal(rows[1].quantity, "750");
  });

  it("12. blank clipboard lines ignored", () => {
    const rows = parseSpreadsheetTsv("A\t100\tG\t1000\n\n   \nB\t200\tG\t2000");
    assert.equal(rows.length, 2);
  });

  it("13. invalid pasted row keeps field errors", () => {
    const rows = parseSpreadsheetTsv("NoQty\t\tG\t1000");
    assert.ok(rows[0].fieldErrors?.quantity);
  });

  it("8. revenue recalculates from quantity × sell price", () => {
    const live = computeSpreadsheetLiveRow({
      quantity: 270,
      sellingPricePerUnit: 162000,
      totalCost: null,
    });
    assert.equal(live.revenue, 43740000);
  });

  it("10. Enter/Tab column navigation helper", () => {
    assert.equal(nextEditableColumn("style", 1), "quantity");
    assert.equal(nextEditableColumn("quantity", -1), "style");
    assert.equal(nextEditableColumn("sellingPrice", 1), "sellingPrice");
  });

  it("22. Big Bang acceptance dataset totals", () => {
    const liveRows = BIG_BANG_ACCEPTANCE_ROWS.map((row) =>
      computeSpreadsheetLiveRow({
        quantity: row.quantity,
        sellingPricePerUnit: row.sell,
        totalCost: null,
      }),
    );
    const totals = computeSpreadsheetTotals(liveRows);
    assert.equal(BIG_BANG_ACCEPTANCE_ROWS.length, 13);
    assert.equal(totals.totalQuantity, 6460);
    assert.equal(totals.totalRevenue, 1163640000);
  });

  it("unknown-vs-zero: zero costEstimate displays as unknown for cost totals", () => {
    const totals = computeSpreadsheetTotals([
      computeSpreadsheetLiveRow({
        quantity: 100,
        sellingPricePerUnit: 1000,
        totalCost: 0,
      }),
    ]);
    assert.equal(totals.hasCostTotals, false);
    assert.equal(totals.totalRevenue, 100000);
    assert.equal(hasKnownCostEstimate(0), false);
    assert.equal(hasKnownCostEstimate(null), false);
    assert.equal(hasKnownCostEstimate(50000), true);
  });

  it("paste to draft preserves invalid rows for review", () => {
    const pasted = parseSpreadsheetTsv("Good\t100\tG\t1000\nBad\tinvalid\tG\t1000");
    const drafts = pasted.map((row, i) => pastedRowToDraft(row, `d-${i}`));
    assert.equal(drafts.length, 2);
    assert.equal(canPersistSpreadsheetRow(drafts[0]), true);
    assert.equal(canPersistSpreadsheetRow(drafts[1]), false);
  });

  it("parse selling price strips thousand separators", () => {
    assert.equal(parseSellingPrice("162.000"), 162000);
    assert.equal(parseIntegerQuantity("750"), 750);
  });
});
