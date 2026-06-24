import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLegacyFitSharedValue,
  listSelectableSharedValues,
  removeAssignmentForAttribute,
  upsertAssignmentForAttribute,
} from "./product-b2b-attribute-controls.utils";
import type { SharedAttributePickerOption } from "@/components/admin/products/ProductOptionGroupBuilder";

const fitAttribute: SharedAttributePickerOption = {
  id: "fit-attr",
  name: "Form dáng",
  code: "FIT",
  slug: "form-dang",
  displayType: "SELECT",
  isSpecificationAttribute: true,
  values: [
    { id: "v1", name: "Basic / Regular", code: "REG", slug: "basic-regular", hexCode: null, imageUrl: null, status: "ACTIVE", sortOrder: 1 },
    { id: "v2", name: "Unisex", code: "UNI", slug: "unisex", hexCode: null, imageUrl: null, status: "ACTIVE", sortOrder: 2 },
  ],
};

describe("product-b2b-attribute-controls.utils", () => {
  it("hides legacy Unisex from new FIT selections", () => {
    const values = listSelectableSharedValues(fitAttribute);
    assert.equal(values.some((value) => value.name === "Unisex"), false);
  });

  it("keeps legacy Unisex visible when already selected", () => {
    const values = listSelectableSharedValues(fitAttribute, "v2", { allowLegacyFitValues: true });
    assert.equal(values.some((value) => value.id === "v2"), true);
  });

  it("detects legacy fit value names", () => {
    assert.equal(isLegacyFitSharedValue("Unisex"), true);
    assert.equal(isLegacyFitSharedValue("Basic / Regular"), false);
  });

  it("upserts and removes assignment rows by attribute id", () => {
    const next = upsertAssignmentForAttribute([], "mat-1", {
      attributeValueId: "val-1",
      useCustomValue: false,
    });
    assert.equal(next.length, 1);
    const cleared = removeAssignmentForAttribute(next, "mat-1");
    assert.equal(cleared.length, 0);
  });
});
