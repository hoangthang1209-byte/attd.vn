import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMatrixCombinationSkuSuffix,
  resolveMatrixOptionValueSkuPart,
  shortDeterministicOptionValueSuffix,
  validateMatrixCombinationForGeneration,
} from "./product-variant-matrix.utils";

const regressionGroups = [
  {
    id: "color",
    name: "Màu sắc",
    slug: "color",
    sortOrder: 0,
    values: [
      { id: "color-den", label: "Den", valueCode: null, sortOrder: 0 },
      { id: "color-xanh", label: "Xanh", valueCode: null, sortOrder: 1 },
      { id: "color-trang", label: "Trang", valueCode: null, sortOrder: 2 },
      { id: "color-do", label: "Do", valueCode: null, sortOrder: 3 },
    ],
  },
  {
    id: "size",
    name: "Kích thước",
    slug: "size",
    sortOrder: 1,
    values: [
      { id: "size-m", label: "M", valueCode: null, sortOrder: 0 },
      { id: "size-l", label: "L", valueCode: null, sortOrder: 1 },
      { id: "size-xl", label: "XL", valueCode: null, sortOrder: 2 },
      { id: "size-2xl", label: "2XL", valueCode: null, sortOrder: 3 },
      { id: "size-3xl", label: "3XL", valueCode: null, sortOrder: 4 },
    ],
  },
];

const navyXsGroups = [
  {
    id: "color",
    name: "Màu sắc",
    slug: "color",
    sortOrder: 0,
    values: [
      { id: "c-den", label: "Đen", valueCode: "BLK", sortOrder: 0 },
      { id: "c-navy", label: "Navy", valueCode: "NVY", sortOrder: 1 },
      { id: "c-vang", label: "Vàng", valueCode: "YLW", sortOrder: 2 },
      { id: "c-cam", label: "Cam", valueCode: "ORG", sortOrder: 3 },
    ],
  },
  {
    id: "size",
    name: "Kích thước",
    slug: "size",
    sortOrder: 1,
    values: [
      { id: "s-xs", label: "XS", valueCode: "XS", sortOrder: 0 },
      { id: "s-s", label: "S", valueCode: "S", sortOrder: 1 },
      { id: "s-m", label: "M", valueCode: "M", sortOrder: 2 },
      { id: "s-l", label: "L", valueCode: "L", sortOrder: 3 },
    ],
  },
];

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

  it("builds legacy color/size suffix for Den / M without legacy colorId/sizeId", () => {
    assert.equal(
      buildMatrixCombinationSkuSuffix(regressionGroups, ["color-den", "size-m"]),
      "BLK-M",
    );
  });

  it("generates valid SKU suffix for Navy / XS with English color name", () => {
    assert.equal(buildMatrixCombinationSkuSuffix(navyXsGroups, ["c-navy", "s-xs"]), "NVY-XS");
    assert.equal(resolveMatrixOptionValueSkuPart(navyXsGroups[0]!.values[1]!), "NVY");
  });

  it("builds Navy suffix from label alone when valueCode is missing", () => {
    const groups = [
      {
        ...navyXsGroups[0]!,
        values: [{ id: "c-navy", label: "Navy", valueCode: null, sortOrder: 0 }],
      },
      {
        ...navyXsGroups[1]!,
        values: [{ id: "s-xs", label: "XS", valueCode: null, sortOrder: 0 }],
      },
    ];
    const suffix = buildMatrixCombinationSkuSuffix(groups, ["c-navy", "s-xs"]);
    assert.ok(suffix.length > 0);
    assert.match(suffix, /NVY/i);
    assert.match(suffix, /XS/i);
  });

  it("falls back to deterministic optionValueId suffix when code and label normalize empty", () => {
    const value = { id: "cmk9abc123xyz", label: "---", valueCode: null, sortOrder: 0 };
    assert.equal(resolveMatrixOptionValueSkuPart(value), shortDeterministicOptionValueSuffix(value.id));
    assert.equal(resolveMatrixOptionValueSkuPart(value).length, 4);
  });
});

describe("validateMatrixCombinationForGeneration", () => {
  it("accepts one option value id from each active group", () => {
    assert.equal(
      validateMatrixCombinationForGeneration(regressionGroups, ["color-den", "size-m"]),
      null,
    );
  });

  it("rejects missing option values with actionable detail", () => {
    assert.match(
      validateMatrixCombinationForGeneration(regressionGroups, ["color-den"]) ?? "",
      /thiếu giá trị tuỳ chọn/i,
    );
    assert.match(
      validateMatrixCombinationForGeneration(regressionGroups, ["missing-id", "size-m"]) ?? "",
      /không tồn tại trong nhóm "Màu sắc"/,
    );
  });
});
