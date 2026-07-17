import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyTeeShirtSizeChartColumns,
  buildSizeChartRowsFromVariantSizes,
  createEmptyProductSizeChart,
  isPublicSizeChartRenderable,
  mergePublicSizeChartIntoMetadata,
  normalizeProductSizeChart,
  parsePublicSizeChartFromMetadata,
  serializeProductSizeChartForMetadata,
  validateProductSizeChartForSave,
  type ProductSizeChart,
} from "@/features/products/product-size-chart";

describe("product size chart normalize", () => {
  it("normalizes a valid size chart metadata payload", () => {
    const chart = normalizeProductSizeChart({
      enabled: true,
      unit: "cm",
      title: "Bảng size áo thun",
      note: "±1–2cm",
      columns: [
        { id: "chest", label: "Ngang ngực" },
        { id: "length", label: "Dài áo" },
      ],
      rows: [
        { id: "m", size: "M", values: { chest: "50", length: "68" } },
        { id: "l", size: "L", values: { chest: "52–54", length: "70" } },
      ],
    });

    assert.equal(chart.enabled, true);
    assert.equal(chart.unit, "cm");
    assert.equal(chart.title, "Bảng size áo thun");
    assert.equal(chart.columns.length, 2);
    assert.equal(chart.rows.length, 2);
    assert.equal(chart.rows[1]?.values.chest, "52–54");
  });

  it("treats invalid payload as empty disabled chart", () => {
    const chart = normalizeProductSizeChart("bad");
    assert.deepEqual(chart, createEmptyProductSizeChart());
  });
});

describe("product size chart renderability", () => {
  it("disabled chart does not render", () => {
    const chart: ProductSizeChart = {
      enabled: false,
      unit: "cm",
      columns: [{ id: "chest", label: "Ngang ngực" }],
      rows: [{ id: "m", size: "M", values: { chest: "50" } }],
    };
    assert.equal(isPublicSizeChartRenderable(chart), false);
  });

  it("empty chart does not render", () => {
    assert.equal(
      isPublicSizeChartRenderable({
        enabled: true,
        unit: "cm",
        columns: [],
        rows: [],
      }),
      false,
    );
  });

  it("enabled chart with rows/columns is renderable", () => {
    assert.equal(
      isPublicSizeChartRenderable({
        enabled: true,
        unit: "cm",
        columns: [{ id: "chest", label: "Ngang ngực" }],
        rows: [{ id: "m", size: "M", values: { chest: "50" } }],
      }),
      true,
    );
  });
});

describe("buildSizeChartRowsFromVariantSizes", () => {
  it("dedupes sizes and keeps option order", () => {
    const rows = buildSizeChartRowsFromVariantSizes({
      options: [
        {
          name: "Kích thước",
          slug: "size",
          values: [
            { label: "M", sortOrder: 0 },
            { label: "L", sortOrder: 1 },
            { label: "m", sortOrder: 2 },
            { label: "XL", sortOrder: 3 },
          ],
        },
      ],
      existingColumns: [{ id: "chest", label: "Ngang ngực" }],
    });

    assert.deepEqual(
      rows.map((row) => row.size),
      ["M", "L", "XL"],
    );
    assert.equal(rows[0]?.values.chest, "");
  });
});

describe("metadata merge preserves existing keys", () => {
  it("merges publicSizeChart without dropping curated badges / productEntry", () => {
    const merged = mergePublicSizeChartIntoMetadata(
      {
        curatedSalesBadges: ["NEW"],
        productEntry: { mode: "FAST" },
        otherKey: true,
      },
      {
        enabled: true,
        unit: "cm",
        title: "Bảng size",
        columns: [{ id: "chest", label: "Ngang ngực" }],
        rows: [{ id: "m", size: "M", values: { chest: "50" } }],
      },
    );

    assert.deepEqual(merged.curatedSalesBadges, ["NEW"]);
    assert.deepEqual(merged.productEntry, { mode: "FAST" });
    assert.equal(merged.otherKey, true);
    const chart = parsePublicSizeChartFromMetadata(merged);
    assert.equal(chart.enabled, true);
    assert.equal(chart.rows[0]?.size, "M");
  });

  it("serialize clears empty disabled chart from metadata", () => {
    assert.equal(serializeProductSizeChartForMetadata(createEmptyProductSizeChart()), null);
  });
});

describe("validateProductSizeChartForSave", () => {
  it("allows disabled empty chart", () => {
    assert.equal(validateProductSizeChartForSave(createEmptyProductSizeChart()), null);
  });

  it("requires rows and columns when enabled", () => {
    assert.match(
      validateProductSizeChartForSave({
        enabled: true,
        unit: "cm",
        columns: [],
        rows: [],
      }) ?? "",
      /Bảng size/,
    );
  });
});

describe("applyTeeShirtSizeChartColumns", () => {
  it("adds basic tee columns", () => {
    const next = applyTeeShirtSizeChartColumns(createEmptyProductSizeChart());
    assert.deepEqual(
      next.columns.map((column) => column.label),
      ["Ngang ngực", "Dài áo", "Rộng vai", "Dài tay"],
    );
  });
});
