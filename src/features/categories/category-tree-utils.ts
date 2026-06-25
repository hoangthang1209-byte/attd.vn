export type CategoryTreeItem = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
};

export type FlattenedCategoryRow<T extends CategoryTreeItem> = T & {
  depth: number;
  isRoot: boolean;
  parentPathNames: string[];
  isOrphan: boolean;
};

export const CATEGORY_INDENT_PX_PER_LEVEL = 28;

export function getCategoryIndentPx(depth: number): number {
  return depth * CATEGORY_INDENT_PX_PER_LEVEL;
}

export function compareCategorySiblings<T extends CategoryTreeItem>(a: T, b: T): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name, "vi");
}

export function buildChildrenMap<T extends CategoryTreeItem>(
  categories: T[],
): Map<string, T[]> {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const children = new Map<string, T[]>();

  for (const category of categories) {
    if (!category.parentId || !byId.has(category.parentId)) continue;
    const siblings = children.get(category.parentId) ?? [];
    siblings.push(category);
    children.set(category.parentId, siblings);
  }

  for (const siblings of children.values()) {
    siblings.sort(compareCategorySiblings);
  }

  return children;
}

export function getRootCategories<T extends CategoryTreeItem>(
  categories: T[],
): { roots: T[]; orphans: T[] } {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const roots: T[] = [];
  const orphans: T[] = [];

  for (const category of categories) {
    if (!category.parentId) {
      roots.push(category);
    } else if (!byId.has(category.parentId)) {
      orphans.push(category);
    }
  }

  roots.sort(compareCategorySiblings);
  orphans.sort(compareCategorySiblings);

  return { roots, orphans };
}

export function flattenCategoryTree<T extends CategoryTreeItem>(
  categories: T[],
): FlattenedCategoryRow<T>[] {
  if (categories.length === 0) return [];

  const childrenMap = buildChildrenMap(categories);
  const { roots, orphans } = getRootCategories(categories);
  const result: FlattenedCategoryRow<T>[] = [];
  const pathStack = new Set<string>();

  function walk(
    category: T,
    depth: number,
    parentPathNames: string[],
    isOrphan: boolean,
  ) {
    if (pathStack.has(category.id)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[flattenCategoryTree] Circular reference at "${category.name}" (${category.id})`,
        );
      }
      return;
    }

    pathStack.add(category.id);
    result.push({
      ...category,
      depth,
      isRoot: depth === 0,
      parentPathNames,
      isOrphan,
    });

    const children = childrenMap.get(category.id) ?? [];
    for (const child of children) {
      walk(child, depth + 1, [...parentPathNames, category.name], false);
    }

    pathStack.delete(category.id);
  }

  for (const root of roots) {
    walk(root, 0, [], false);
  }

  for (const orphan of orphans) {
    walk(orphan, 0, [], true);
  }

  const visitedIds = new Set(result.map((row) => row.id));
  const unvisited = categories
    .filter((category) => !visitedIds.has(category.id))
    .sort(compareCategorySiblings);

  for (const category of unvisited) {
    if (result.some((row) => row.id === category.id)) continue;
    walk(category, 0, [], true);
  }

  return result;
}

export function getCategoryDescendantIds(
  categoryId: string,
  categories: Pick<CategoryTreeItem, "id" | "parentId">[],
): Set<string> {
  const childrenMap = new Map<string, string[]>();

  for (const category of categories) {
    if (!category.parentId) continue;
    const siblings = childrenMap.get(category.parentId) ?? [];
    siblings.push(category.id);
    childrenMap.set(category.parentId, siblings);
  }

  const descendants = new Set<string>();
  const stack = [...(childrenMap.get(categoryId) ?? [])];

  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || descendants.has(id)) continue;
    descendants.add(id);
    stack.push(...(childrenMap.get(id) ?? []));
  }

  return descendants;
}

export const CATEGORY_PARENT_SELF_ERROR =
  "Không thể chọn chính danh mục này làm danh mục cha.";

export const CATEGORY_PARENT_DESCENDANT_ERROR =
  "Không thể chọn danh mục con làm danh mục cha.";

export const CATEGORY_PARENT_NOT_LEVEL1_ERROR =
  "Chỉ có thể chọn danh mục cấp 1 làm danh mục cha.";

export const CATEGORY_PARENT_HAS_CHILDREN_ERROR =
  "Không thể đặt danh mục cha vì danh mục này đang có danh mục con.";

export const CATEGORY_MAX_DEPTH_ERROR =
  "Danh mục chỉ được có tối đa 2 cấp (loại sản phẩm và form/công dụng).";

export const CATEGORY_SLUG_DUPLICATE_ERROR = "Slug danh mục đã tồn tại.";

export const CATEGORY_MAX_DEPTH = 2;

export function categoryHasChildren(
  categoryId: string,
  categories: Pick<CategoryTreeItem, "id" | "parentId">[],
): boolean {
  return categories.some((category) => category.parentId === categoryId);
}

export function getCategoryDepth(
  categoryId: string,
  categories: Pick<CategoryTreeItem, "id" | "parentId">[],
): number {
  const byId = new Map(categories.map((category) => [category.id, category]));
  let depth = 0;
  let current = byId.get(categoryId);

  while (current?.parentId) {
    depth += 1;
    current = byId.get(current.parentId);
    if (depth > CATEGORY_MAX_DEPTH) break;
  }

  return depth;
}

export function validateCategoryMaxDepth(
  categoryId: string | null,
  parentId: string | null,
  categories: Pick<CategoryTreeItem, "id" | "parentId">[],
): string | null {
  if (!parentId) return null;

  const parent = categories.find((category) => category.id === parentId);
  if (!parent) return null;

  if (parent.parentId) {
    return CATEGORY_PARENT_NOT_LEVEL1_ERROR;
  }

  if (categoryId) {
    const current = categories.find((category) => category.id === categoryId);
    if (current?.parentId === parentId) {
      return null;
    }
    if (categoryHasChildren(categoryId, categories)) {
      return CATEGORY_PARENT_HAS_CHILDREN_ERROR;
    }
  }

  return null;
}

export function validateCategoryParentSelection(
  categoryId: string | null,
  parentId: string | null,
  categories: Pick<CategoryTreeItem, "id" | "parentId">[],
): string | null {
  if (!parentId) return null;
  if (categoryId && parentId === categoryId) {
    return CATEGORY_PARENT_SELF_ERROR;
  }
  if (categoryId) {
    const descendants = getCategoryDescendantIds(categoryId, categories);
    if (descendants.has(parentId)) {
      return CATEGORY_PARENT_DESCENDANT_ERROR;
    }
  }

  return validateCategoryMaxDepth(categoryId, parentId, categories);
}

export type HierarchicalParentOption = {
  id: string;
  label: string;
  depth: number;
};

export function formatParentOptionLabel(name: string, depth: number): string {
  if (depth === 0) return name;
  const indent = "\u00A0\u00A0".repeat(depth);
  return `${indent}↳ ${name}`;
}

export function buildLevel1ParentOptions(
  categories: CategoryTreeItem[],
  excludeCategoryId: string | null,
): HierarchicalParentOption[] {
  const excludeIds = new Set<string>();

  if (excludeCategoryId) {
    excludeIds.add(excludeCategoryId);
    for (const id of getCategoryDescendantIds(excludeCategoryId, categories)) {
      excludeIds.add(id);
    }
  }

  return categories
    .filter((category) => !category.parentId && !excludeIds.has(category.id))
    .sort(compareCategorySiblings)
    .map((category) => ({
      id: category.id,
      depth: 0,
      label: category.name,
    }));
}

export function buildHierarchicalParentOptions(
  categories: CategoryTreeItem[],
  excludeCategoryId: string | null,
): HierarchicalParentOption[] {
  const flattened = flattenCategoryTree(categories);
  const excludeIds = new Set<string>();

  if (excludeCategoryId) {
    excludeIds.add(excludeCategoryId);
    for (const id of getCategoryDescendantIds(excludeCategoryId, categories)) {
      excludeIds.add(id);
    }
  }

  return flattened
    .filter((row) => !excludeIds.has(row.id))
    .map((row) => ({
      id: row.id,
      depth: row.depth,
      label: formatParentOptionLabel(row.name, row.depth),
    }));
}

export function formatParentHint(parentPathNames: string[]): string | null {
  if (parentPathNames.length === 0) return null;
  if (parentPathNames.length === 1) {
    return `Thuộc: ${parentPathNames[0]}`;
  }
  return `Thuộc: ${parentPathNames.join(" › ")}`;
}
