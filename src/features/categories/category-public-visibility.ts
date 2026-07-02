import { prisma } from "@/lib/prisma";

export type CategoryVisibilityNode = {
  id: string;
  parentId: string | null;
  isActive: boolean;
  slug: string;
};

export function isCategoryBranchActive(
  categoryId: string,
  nodes: CategoryVisibilityNode[],
): boolean {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  let currentId: string | null = categoryId;

  while (currentId) {
    if (visited.has(currentId)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[category-public-visibility] Cycle detected at category ${currentId}`);
      }
      return false;
    }
    visited.add(currentId);

    const node = byId.get(currentId);
    if (!node) return false;
    if (!node.isActive) return false;

    currentId = node.parentId;
  }

  return true;
}

export async function loadCategoryVisibilityNodes(): Promise<CategoryVisibilityNode[]> {
  return prisma.category.findMany({
    select: { id: true, parentId: true, isActive: true, slug: true },
  });
}

export async function isCategoryPubliclyAccessibleBySlug(slug: string): Promise<boolean> {
  const nodes = await loadCategoryVisibilityNodes();
  const target = nodes.find((node) => node.slug === slug);
  if (!target) return false;
  return isCategoryBranchActive(target.id, nodes);
}

export async function isCategoryPubliclyAccessibleById(categoryId: string): Promise<boolean> {
  const nodes = await loadCategoryVisibilityNodes();
  return isCategoryBranchActive(categoryId, nodes);
}

export function filterPubliclyActiveCategoryTree<T extends { id: string; isActive: boolean; children: Array<{ id: string; isActive: boolean }> }>(
  tree: T[],
  nodes: CategoryVisibilityNode[],
): T[] {
  return tree
    .filter((parent) => parent.isActive !== false && isCategoryBranchActive(parent.id, nodes))
    .map((parent) => ({
      ...parent,
      children: parent.children.filter(
        (child) => child.isActive !== false && isCategoryBranchActive(child.id, nodes),
      ),
    }));
}
