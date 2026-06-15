"use client";

import { useCallback, useEffect, useState } from "react";
import type { KnowledgeBaseCategoryRecord } from "@/features/knowledge-base/knowledge-base-types";
import { toSlug } from "@/lib/slug";

export default function KnowledgeBaseCategoryManager() {
  const [categories, setCategories] = useState<KnowledgeBaseCategoryRecord[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/knowledge-base/categories");
    const data = await res.json();
    setCategories(Array.isArray(data.categories) ? data.categories : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCategory() {
    if (!name.trim()) return;
    const res = await fetch("/api/admin/knowledge-base/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: toSlug(name), description }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.message ?? "Không thể tạo danh mục");
      return;
    }
    setName("");
    setDescription("");
    setMessage("Đã tạo danh mục.");
    void load();
  }

  async function toggleActive(category: KnowledgeBaseCategoryRecord) {
    await fetch(`/api/admin/knowledge-base/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !category.isActive }),
    });
    void load();
  }

  async function deleteCategory(category: KnowledgeBaseCategoryRecord) {
    const res = await fetch(`/api/admin/knowledge-base/categories/${category.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.message ?? "Không thể xóa danh mục");
      return;
    }
    void load();
  }

  return (
    <div className="admin-kb-category-manager">
      {message && <p className="admin-field-hint">{message}</p>}
      <div className="admin-kb-category-form">
        <input className="admin-input" placeholder="Tên danh mục" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="admin-input" placeholder="Mô tả" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="button" className="admin-btn admin-btn--primary" onClick={() => void createCategory()}>
          Thêm danh mục
        </button>
      </div>
      <div className="admin-kb-category-list">
        {categories.map((category) => (
          <div key={category.id} className="admin-kb-category-row">
            <div>
              <strong>{category.name}</strong>
              <p className="admin-field-hint">{category.description}</p>
              <p className="admin-field-hint">{category.entryCount ?? 0} entries · sort {category.sortOrder}</p>
            </div>
            <div className="admin-kb-entry-actions">
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void toggleActive(category)}>
                {category.isActive ? "Tắt" : "Bật"}
              </button>
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void deleteCategory(category)}>
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
