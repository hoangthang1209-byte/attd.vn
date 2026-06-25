import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getActiveChildrenOfParent,
  getActiveParentCategories,
  resolveCategoryPickerSelection,
  resolveFinalCategoryId,
  validateProductCategorySelection,
} from "./category-cascade-utils";
import {
  CATEGORY_PARENT_HAS_CHILDREN_ERROR,
  CATEGORY_PARENT_NOT_LEVEL1_ERROR,
  validateCategoryMaxDepth,
  validateCategoryParentSelection,
} from "./category-tree-utils";

describe("category-cascade-utils", () => {
  const categories = [
    { id: "polo", name: "Áo polo", nameEn: "Polo Shirts", parentId: null, isActive: true, skuCode: "POLS" },
    { id: "sport", name: "Thể thao", nameEn: "Sports Polo", parentId: "polo", isActive: true, skuCode: "SPOL" },
    { id: "tote", name: "Túi tote", nameEn: "Tote Bags", parentId: null, isActive: true, skuCode: "TOTE" },
    { id: "hidden", name: "Ẩn", parentId: "polo", isActive: false, skuCode: "HIDN" },
  ];

  it("lists only active parent categories", () => {
    assert.deepEqual(
      getActiveParentCategories(categories).map((category) => category.id),
      ["polo", "tote"],
    );
  });

  it("filters children by selected parent", () => {
    assert.deepEqual(
      getActiveChildrenOfParent(categories, "polo").map((category) => category.id),
      ["sport"],
    );
  });

  it("resolves child preselection for existing products", () => {
    assert.deepEqual(resolveCategoryPickerSelection("sport", categories), {
      parentId: "polo",
      childId: "sport",
      isParentOnly: false,
    });
  });

  it("resolves parent-only preselection", () => {
    assert.deepEqual(resolveCategoryPickerSelection("tote", categories), {
      parentId: "tote",
      childId: "",
      isParentOnly: true,
    });
  });

  it("requires child when parent has active children", () => {
    assert.equal(
      validateProductCategorySelection("polo", categories),
      "Vui lòng chọn form dáng hoặc công dụng cho loại sản phẩm này.",
    );
    assert.equal(validateProductCategorySelection("sport", categories), null);
    assert.equal(validateProductCategorySelection("tote", categories), null);
  });

  it("clears final category when parent changes to one with children but no child selected", () => {
    assert.equal(resolveFinalCategoryId("polo", "", categories), "");
    assert.equal(resolveFinalCategoryId("tote", "", categories), "tote");
  });
});

describe("category max depth", () => {
  const categories = [
    { id: "root", name: "Root", parentId: null, sortOrder: 0 },
    { id: "child", name: "Child", parentId: "root", sortOrder: 0 },
    { id: "grandchild", name: "Grandchild", parentId: "child", sortOrder: 0 },
  ];

  it("rejects level-2 parent selection", () => {
    assert.equal(
      validateCategoryMaxDepth("new", "child", categories),
      CATEGORY_PARENT_NOT_LEVEL1_ERROR,
    );
  });

  it("rejects parent assignment when category has children", () => {
    assert.equal(
      validateCategoryMaxDepth("root", "other", [
        { id: "root", parentId: null },
        { id: "child", parentId: "root" },
        { id: "other", parentId: null },
      ]),
      CATEGORY_PARENT_HAS_CHILDREN_ERROR,
    );
  });

  it("allows valid parent changes and blocks descendants", () => {
    assert.equal(
      validateCategoryParentSelection("root", "grandchild", categories),
      "Không thể chọn danh mục con làm danh mục cha.",
    );
    assert.equal(
      validateCategoryParentSelection("grandchild", "child", categories),
      CATEGORY_PARENT_NOT_LEVEL1_ERROR,
    );
  });
});
