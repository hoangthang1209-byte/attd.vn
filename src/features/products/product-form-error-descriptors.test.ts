import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assignmentFieldKey,
  normalizeProductFormFieldErrors,
} from "./product-form-row-error-keys";
import {
  buildProductFormErrorDescriptors,
  formatErrorSummaryLine,
} from "./product-form-error-descriptors";

describe("product form error descriptors", () => {
  it("normalizes index-based assignment errors to stable keys", () => {
    const assignments = [
      { id: "a1", clientKey: "a1", attributeId: "attr-1", useCustomValue: false, sortOrder: 0 },
    ];
    const normalized = normalizeProductFormFieldErrors(
      { "attributeAssignments.0.attributeValueId": "Vui lòng chọn giá trị." },
      { attributeAssignments: assignments },
    );
    assert.equal(
      normalized[assignmentFieldKey(assignments[0], "attributeValueId")],
      "Vui lòng chọn giá trị.",
    );
    assert.equal(normalized["attributeAssignments.0.attributeValueId"], undefined);
  });

  it("routes MATERIAL assignment errors to basic tab with b2b focus target", () => {
    const descriptors = buildProductFormErrorDescriptors(
      {
        [assignmentFieldKey({ id: "a1", clientKey: "a1" }, "attributeValueId")]:
          "Vui lòng chọn giá trị.",
      },
      {
        attributeAssignments: [
          { id: "a1", clientKey: "a1", attributeId: "attr-material", useCustomValue: false, sortOrder: 0 },
        ],
        sharedAttributes: [{ id: "attr-material", code: "MATERIAL", name: "Chất liệu" }],
      },
    );
    assert.equal(descriptors[0]?.tab, "basic");
    assert.equal(descriptors[0]?.focusTarget, "b2b-material");
    assert.match(formatErrorSummaryLine(descriptors[0]!), /Thông tin cơ bản/);
  });
});
