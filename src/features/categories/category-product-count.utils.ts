export type CategoryCountChild = {
  id: string;
  directProductCount: number;
};

export function sumDescendantProductCountsSafe(
  categoryId: string,
  byParent: Map<string, CategoryCountChild[]>,
  visited: Set<string> = new Set(),
): number {
  if (visited.has(categoryId)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[category-product-count] Cycle detected at category ${categoryId}`);
    }
    return 0;
  }

  visited.add(categoryId);
  let total = 0;

  for (const child of byParent.get(categoryId) ?? []) {
    total += child.directProductCount + sumDescendantProductCountsSafe(child.id, byParent, visited);
  }

  visited.delete(categoryId);
  return total;
}
