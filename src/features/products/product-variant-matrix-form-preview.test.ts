import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeFormMatrixPreview,
  formatVariantMatrixGenerationMessage,
} from "./product-variant-matrix-form-preview";

describe("computeFormMatrixPreview", () => {
  const groups = [
    {
      id: "g-color",
      name: "Màu sắc",
      slug: "color",
      sortOrder: 0,
      values: [
        { id: "c1", label: "Đen", valueCode: "BLK", sortOrder: 0 },
        { id: "c2", label: "Trắng", valueCode: "WHT", sortOrder: 1 },
        { id: "c3", label: "Navy", valueCode: "NVY", sortOrder: 2 },
      ],
    },
    {
      id: "g-size",
      name: "Kích thước",
      slug: "size",
      sortOrder: 1,
      values: [
        { id: "s1", label: "S", valueCode: "S", sortOrder: 0 },
        { id: "s2", label: "M", valueCode: "M", sortOrder: 1 },
        { id: "s3", label: "L", valueCode: "L", sortOrder: 2 },
      ],
    },
  ];

  it("reports 9 missing combinations when none exist", () => {
    const preview = computeFormMatrixPreview(groups, []);
    assert.equal(preview.theoreticalCount, 9);
    assert.equal(preview.missingCount, 9);
    assert.equal(preview.existingCount, 0);
    assert.equal(preview.canGenerate, true);
  });

  it("skips existing combinations", () => {
    const preview = computeFormMatrixPreview(groups, [
      { optionValueIds: ["c1", "s1"] },
      { optionValueIds: ["c1", "s2"] },
    ]);
    assert.equal(preview.existingCount, 2);
    assert.equal(preview.missingCount, 7);
  });

  it("reports zero missing when all combinations exist", () => {
    const all = [
      ["c1", "s1"],
      ["c1", "s2"],
      ["c1", "s3"],
      ["c2", "s1"],
      ["c2", "s2"],
      ["c2", "s3"],
      ["c3", "s1"],
      ["c3", "s2"],
      ["c3", "s3"],
    ];
    const preview = computeFormMatrixPreview(
      groups,
      all.map((optionValueIds) => ({ optionValueIds })),
    );
    assert.equal(preview.missingCount, 0);
    assert.equal(preview.canGenerate, false);
    assert.equal(preview.message, "Tất cả tổ hợp biến thể đã tồn tại.");
  });

  it("requires at least two option groups", () => {
    const preview = computeFormMatrixPreview([groups[0]], []);
    assert.equal(preview.canGenerate, false);
    assert.equal(
      preview.message,
      "Vui lòng thêm ít nhất 2 nhóm tuỳ chọn và giá trị trước khi tạo tổ hợp.",
    );
  });
});

describe("formatVariantMatrixGenerationMessage", () => {
  it("formats partial and full creation summaries", () => {
    assert.equal(
      formatVariantMatrixGenerationMessage(3, 2),
      "Đã tạo 3 biến thể mới, bỏ qua 2 biến thể đã có.",
    );
    assert.equal(formatVariantMatrixGenerationMessage(9, 0), "Đã tạo 9 biến thể mới.");
    assert.equal(
      formatVariantMatrixGenerationMessage(0, 9),
      "Tất cả tổ hợp biến thể đã tồn tại.",
    );
  });
});
