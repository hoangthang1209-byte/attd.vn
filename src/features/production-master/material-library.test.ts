import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMaterialSpecLabel,
  formatSupplierCountLabel,
  formatSupplierPriceRange,
  materialLibraryTypeLabel,
  summarizeActiveSourcePrices,
} from "@/features/production-master/material-library";

describe("Material Library helpers", () => {
  it("labels Vải vs Phụ liệu", () => {
    assert.equal(materialLibraryTypeLabel("material"), "Vải");
    assert.equal(materialLibraryTypeLabel("trim"), "Phụ liệu");
  });

  it("builds fabric spec from composition/gsm/width", () => {
    assert.equal(
      buildMaterialSpecLabel({ composition: "Cotton 100%", gsm: "250", width: "1.5m" }),
      "Cotton 100% · 250 GSM · Khổ 1.5m",
    );
    assert.equal(buildMaterialSpecLabel({}), "—");
  });

  it("summarizes multiple supplier prices without preferring cheapest", () => {
    const summary = summarizeActiveSourcePrices([
      { unitPrice: 95000, unit: "kg" },
      { unitPrice: 91000, unit: "kg" },
    ]);
    assert.equal(summary.activeCount, 2);
    assert.equal(summary.minUnitPrice, 91000);
    assert.equal(summary.maxUnitPrice, 95000);
    assert.equal(summary.unit, "kg");
    assert.equal(formatSupplierCountLabel(2), "2 NCC");
    assert.match(formatSupplierPriceRange(summary), /91\.000/);
    assert.match(formatSupplierPriceRange(summary), /95\.000/);
    assert.doesNotMatch(formatSupplierPriceRange(summary), /tốt nhất|rẻ nhất/i);
  });

  it("shows zero-price empty state", () => {
    const summary = summarizeActiveSourcePrices([]);
    assert.equal(summary.activeCount, 0);
    assert.equal(formatSupplierCountLabel(0), "Chưa có NCC");
    assert.equal(formatSupplierPriceRange(summary), "Chưa có giá nhà cung cấp");
  });

  it("flags mixed units neutrally", () => {
    const summary = summarizeActiveSourcePrices([
      { unitPrice: 95000, unit: "kg" },
      { unitPrice: 850, unit: "cái" },
    ]);
    assert.equal(summary.unit, "nhiều ĐV");
  });
});
