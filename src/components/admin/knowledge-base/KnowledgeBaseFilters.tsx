"use client";

import { useEffect, useState } from "react";
import type { KnowledgeBaseCategoryRecord } from "@/features/knowledge-base/knowledge-base-types";
import { KNOWLEDGE_USAGE_SCOPES } from "@/features/knowledge-base/knowledge-base-types";

type Filters = {
  search: string;
  categoryId: string;
  type: string;
  status: string;
  usageScope: string;
  priority: string;
  verifiedOnly: boolean;
};

type Props = {
  filters: Filters;
  onChange: (filters: Filters) => void;
};

const ENTRY_TYPES = [
  "COMPANY", "PRODUCT", "OEM", "DEALER", "POLICY", "LOGISTICS", "BRAND_VOICE", "SEO_CONTEXT", "FAQ", "CASE_STUDY",
];

export default function KnowledgeBaseFilters({ filters, onChange }: Props) {
  const [categories, setCategories] = useState<KnowledgeBaseCategoryRecord[]>([]);

  useEffect(() => {
    void fetch("/api/admin/knowledge-base/categories")
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data.categories) ? data.categories : []));
  }, []);

  return (
    <div className="admin-kb-filters">
      <input
        className="admin-input"
        placeholder="Tìm kiếm…"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
      />
      <select
        className="admin-input"
        value={filters.categoryId}
        onChange={(e) => onChange({ ...filters, categoryId: e.target.value })}
      >
        <option value="">Tất cả danh mục</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>
      <select
        className="admin-input"
        value={filters.type}
        onChange={(e) => onChange({ ...filters, type: e.target.value })}
      >
        <option value="">Tất cả loại</option>
        {ENTRY_TYPES.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      <select
        className="admin-input"
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
      >
        <option value="">Tất cả trạng thái</option>
        <option value="DRAFT">Nháp</option>
        <option value="ACTIVE">Đang dùng</option>
        <option value="ARCHIVED">Lưu trữ</option>
      </select>
      <select
        className="admin-input"
        value={filters.usageScope}
        onChange={(e) => onChange({ ...filters, usageScope: e.target.value })}
      >
        <option value="">Tất cả phạm vi</option>
        {KNOWLEDGE_USAGE_SCOPES.map((scope) => (
          <option key={scope.id} value={scope.id}>{scope.label}</option>
        ))}
      </select>
      <select
        className="admin-input"
        value={filters.priority}
        onChange={(e) => onChange({ ...filters, priority: e.target.value })}
      >
        <option value="">Tất cả ưu tiên</option>
        <option value="HIGH">Cao</option>
        <option value="MEDIUM">Trung bình</option>
        <option value="LOW">Thấp</option>
      </select>
      <label className="admin-radio-item">
        <input
          type="checkbox"
          checked={filters.verifiedOnly}
          onChange={(e) => onChange({ ...filters, verifiedOnly: e.target.checked })}
        />
        <span>Chỉ entry đã kiểm chứng</span>
      </label>
    </div>
  );
}
