"use client";

import { useMemo, useState } from "react";
import type { BlogCategoryRecord } from "@/features/blog/types";

type BlogCategorySelectorProps = {
  categories: BlogCategoryRecord[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

type CategoryNode = {
  category: BlogCategoryRecord;
  children: BlogCategoryRecord[];
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
}

/**
 * Categories have no parent column, so the tree is derived from slug paths
 * (`ao-thun/oem` nests under `ao-thun`). Flat slugs simply render at root.
 */
function buildTree(categories: BlogCategoryRecord[]): CategoryNode[] {
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const roots: CategoryNode[] = [];
  const nodeBySlug = new Map<string, CategoryNode>();

  for (const category of categories) {
    const parentSlug = category.slug.includes("/")
      ? category.slug.slice(0, category.slug.lastIndexOf("/"))
      : null;
    if (parentSlug && bySlug.has(parentSlug)) continue;

    const node: CategoryNode = { category, children: [] };
    nodeBySlug.set(category.slug, node);
    roots.push(node);
  }

  for (const category of categories) {
    const parentSlug = category.slug.includes("/")
      ? category.slug.slice(0, category.slug.lastIndexOf("/"))
      : null;
    if (!parentSlug) continue;
    const parent = nodeBySlug.get(parentSlug);
    if (parent) parent.children.push(category);
  }

  return roots;
}

export default function BlogCategorySelector({
  categories,
  selectedIds,
  onToggle,
}: BlogCategorySelectorProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return categories;
    return categories.filter((category) => fold(category.name).includes(needle));
  }, [categories, query]);

  const tree = useMemo(() => buildTree(filtered), [filtered]);
  const selected = useMemo(
    () => categories.filter((category) => selectedIds.includes(category.id)),
    [categories, selectedIds],
  );

  return (
    <div className="admin-category-selector">
      {selected.length > 0 && (
        <div className="admin-category-selector__selected">
          {selected.map((category) => (
            <span key={category.id} className="admin-tag-chip">
              {category.name}
              <button
                type="button"
                onClick={() => onToggle(category.id)}
                aria-label={`Bỏ chọn ${category.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        className="admin-input admin-input--small"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm danh mục…"
        aria-label="Tìm danh mục"
      />

      {tree.length === 0 ? (
        <p className="admin-field-hint">Không có danh mục phù hợp.</p>
      ) : (
        <ul className="admin-category-tree">
          {tree.map((node) => (
            <li key={node.category.id}>
              <label className="admin-category-tree__item">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(node.category.id)}
                  onChange={() => onToggle(node.category.id)}
                />
                <span>{node.category.name}</span>
                {typeof node.category.postCount === "number" && (
                  <span className="admin-category-tree__count">{node.category.postCount}</span>
                )}
              </label>

              {node.children.length > 0 && (
                <ul className="admin-category-tree admin-category-tree--child">
                  {node.children.map((child) => (
                    <li key={child.id}>
                      <label className="admin-category-tree__item">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(child.id)}
                          onChange={() => onToggle(child.id)}
                        />
                        <span>{child.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
