import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMatrixCombinationSkuSuffix } from "./product-variant-matrix.utils";

describe("buildMatrixCombinationSkuSuffix", () => {
  it("uses value codes for generic option groups", () => {
    const groups = [
      {
        id: "g1",
        name: "Loại",
        slug: "loai",
        sortOrder: 0,
        values: [
          { id: "v1", label: "Premium", valueCode: "PRM", sortOrder: 0 },
          { id: "v2", label: "Standard", valueCode: "STD", sortOrder: 1 },
        ],
      },
      {
        id: "g2",
        name: "Phiên bản",
        slug: "phien-ban",
        sortOrder: 1,
        values: [
          { id: "v3", label: "2024", valueCode: "24", sortOrder: 0 },
          { id: "v4", label: "2025", valueCode: "25", sortOrder: 1 },
        ],
      },
    ];

    assert.equal(buildMatrixCombinationSkuSuffix(groups, ["v1", "v3"]), "PRM-24");
    assert.equal(buildMatrixCombinationSkuSuffix(groups, ["v2", "v4"]), "STD-25");
  });
});
