import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHierarchicalParentOptions,
  flattenCategoryTree,
  getCategoryDescendantIds,
  getCategoryIndentPx,
  validateCategoryParentSelection,
  CATEGORY_PARENT_DESCENDANT_ERROR,
  CATEGORY_PARENT_SELF_ERROR,
} from "./category-tree-utils";

type TestCategory = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
};

function category(
  id: string,
  name: string,
  parentId: string | null = null,
  sortOrder = 0,
): TestCategory {
  return { id, name, parentId, sortOrder };
}

describe("flattenCategoryTree", () => {
  it("orders siblings by sortOrder then name and nests children under parents", () => {
    const categories = [
      category("b", "Bravo", null, 2),
      category("a", "Alpha", null, 1),
      category("c1", "Child One", "a", 2),
      category("c2", "Child Two", "a", 1),
    ];

    const flattened = flattenCategoryTree(categories);

    assert.deepEqual(
      flattened.map((row) => [row.id, row.depth]),
      [
        ["a", 0],
        ["c2", 1],
        ["c1", 1],
        ["b", 0],
      ],
    );
  });

  it("supports unlimited nesting depth", () => {
    const categories = [
      category("root", "Root"),
      category("l1", "Level 1", "root"),
      category("l2", "Level 2", "l1"),
      category("l3", "Level 3", "l2"),
    ];

    const flattened = flattenCategoryTree(categories);

    assert.deepEqual(
      flattened.map((row) => [row.id, row.depth]),
      [
        ["root", 0],
        ["l1", 1],
        ["l2", 2],
        ["l3", 3],
      ],
    );
  });

  it("marks orphaned categories and keeps them as roots", () => {
    const categories = [category("orphan", "Orphan", "missing-parent")];
    const flattened = flattenCategoryTree(categories);

    assert.equal(flattened.length, 1);
    assert.equal(flattened[0]?.isOrphan, true);
    assert.equal(flattened[0]?.depth, 0);
  });

  it("does not recurse infinitely on circular references", () => {
    const categories = [
      category("a", "A", "b"),
      category("b", "B", "a"),
    ];

    const flattened = flattenCategoryTree(categories);
    const ids = flattened.map((row) => row.id).sort();

    assert.deepEqual(ids, ["a", "b"]);
  });
});

describe("getCategoryIndentPx", () => {
  it("returns 28px per depth level", () => {
    assert.equal(getCategoryIndentPx(0), 0);
    assert.equal(getCategoryIndentPx(1), 28);
    assert.equal(getCategoryIndentPx(2), 56);
  });
});

describe("validateCategoryParentSelection", () => {
  const categories = [
    category("root", "Root"),
    category("child", "Child", "root"),
    category("grandchild", "Grandchild", "child"),
  ];

  it("blocks self-parenting", () => {
    assert.equal(
      validateCategoryParentSelection("root", "root", categories),
      CATEGORY_PARENT_SELF_ERROR,
    );
  });

  it("blocks selecting a descendant as parent", () => {
    assert.equal(
      validateCategoryParentSelection("root", "grandchild", categories),
      CATEGORY_PARENT_DESCENDANT_ERROR,
    );
  });

  it("allows valid parent changes", () => {
    assert.equal(validateCategoryParentSelection("child", "root", categories), null);
    assert.equal(validateCategoryParentSelection("child", null, categories), null);
  });
});

describe("getCategoryDescendantIds", () => {
  it("returns all descendants for nested categories", () => {
    const categories = [
      category("root", "Root"),
      category("child", "Child", "root"),
      category("grandchild", "Grandchild", "child"),
    ];

    const descendants = getCategoryDescendantIds("root", categories);
    assert.deepEqual([...descendants].sort(), ["child", "grandchild"]);
  });
});

describe("buildHierarchicalParentOptions", () => {
  it("excludes the current category and its descendants", () => {
    const categories = [
      category("root", "Root"),
      category("child", "Child", "root"),
      category("grandchild", "Grandchild", "child"),
    ];

    const options = buildHierarchicalParentOptions(categories, "child");
    assert.deepEqual(
      options.map((option) => option.id),
      ["root"],
    );
  });
});

describe("category list refresh ordering", () => {
  it("places a category under its new parent after parentId changes", () => {
    const before = flattenCategoryTree([
      category("root", "Root", null, 0),
      category("child", "Child", null, 1),
    ]);
    assert.deepEqual(
      before.map((row) => row.id),
      ["root", "child"],
    );

    const after = flattenCategoryTree([
      category("root", "Root", null, 0),
      category("child", "Child", "root", 1),
    ]);
    assert.deepEqual(
      after.map((row) => [row.id, row.depth]),
      [
        ["root", 0],
        ["child", 1],
      ],
    );
  });
});
