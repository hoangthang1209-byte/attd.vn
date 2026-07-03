import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PatternValidationError } from "./pattern.service";
import { parsePatternUpdateBody } from "./pattern-update-input";

function measurementPatch(overrides: Record<string, unknown> = {}) {
  return {
    measurements: [
      {
        pointOfMeasure: "Đỉnh",
        description: "Đo từ tỉnh",
        baseSize: "L",
        tolerance: "1",
        sortOrder: 0,
        values: [
          { size: "XS", value: "44" },
          { size: "S", value: "46" },
        ],
        ...overrides,
      },
    ],
  };
}

describe("parsePatternUpdateBody measurement updates", () => {
  it("accepts existing rows with decimal values and preserves baseSize as a label", () => {
    const input = parsePatternUpdateBody(
      measurementPatch({
        values: [
          { size: "XS", value: "44.5" },
          { size: "custom", value: "47" },
        ],
      }),
    );

    assert.deepEqual(input.measurements?.[0], {
      pointOfMeasure: "Đỉnh",
      description: "Đo từ tỉnh",
      baseSize: "L",
      tolerance: "1",
      sortOrder: 0,
      values: [
        { size: "XS", value: "44.5" },
        { size: "CUSTOM", value: "47" },
      ],
    });
  });

  it("normalizes locale comma decimals safely", () => {
    const input = parsePatternUpdateBody(
      measurementPatch({
        tolerance: "1,5",
        values: [{ size: "XS", value: "44,5" }],
      }),
    );

    assert.equal(input.measurements?.[0].tolerance, "1.5");
    assert.deepEqual(input.measurements?.[0].values, [{ size: "XS", value: "44.5" }]);
  });

  it("allows blank optional tolerance and blank measurement values", () => {
    const input = parsePatternUpdateBody(
      measurementPatch({
        tolerance: "",
        values: [
          { size: "XS", value: "" },
          { size: "S", value: "46" },
        ],
      }),
    );

    assert.equal(input.measurements?.[0].tolerance, null);
    assert.deepEqual(input.measurements?.[0].values, [{ size: "S", value: "46" }]);
  });

  it("rejects NaN and invalid numeric strings with field errors", () => {
    assert.throws(
      () =>
        parsePatternUpdateBody(
          measurementPatch({
            values: [
              { size: "XS", value: "NaN" },
              { size: "S", value: "abc" },
            ],
          }),
        ),
      (err) =>
        err instanceof PatternValidationError &&
        err.message === "Dữ liệu bảng đo không hợp lệ." &&
        err.fieldErrors?.["measurements.0.values.XS"] === "Giá trị phải là số hợp lệ." &&
        err.fieldErrors?.["measurements.0.values.S"] === "Giá trị phải là số hợp lệ.",
    );
  });

  it("rejects duplicated size columns after normalization", () => {
    assert.throws(
      () =>
        parsePatternUpdateBody(
          measurementPatch({
            values: [
              { size: "XS", value: "44" },
              { size: "xs", value: "45" },
            ],
          }),
        ),
      (err) =>
        err instanceof PatternValidationError &&
        err.fieldErrors?.["measurements.0.values.XS"] ===
          "Bảng đo có cột size hoặc điểm đo bị trùng.",
    );
  });

  it("rejects duplicated POM rows after normalization", () => {
    assert.throws(
      () =>
        parsePatternUpdateBody({
          measurements: [
            measurementPatch().measurements[0],
            { ...measurementPatch().measurements[0], pointOfMeasure: " đỉnh " },
          ],
        }),
      (err) =>
        err instanceof PatternValidationError &&
        err.fieldErrors?.["measurements.1.pointOfMeasure"] ===
          "Bảng đo có cột size hoặc điểm đo bị trùng.",
    );
  });

  it("supports saving after deleting a size or adding a custom size", () => {
    const input = parsePatternUpdateBody(
      measurementPatch({
        values: [{ size: "5XL", value: "60" }],
      }),
    );

    assert.deepEqual(input.measurements?.[0].values, [{ size: "5XL", value: "60" }]);
  });
});
