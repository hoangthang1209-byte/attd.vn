"use client";

import { useEffect, useState } from "react";
import type { KnowledgeBaseCategoryRecord } from "@/features/knowledge-base/knowledge-base-types";
import { KNOWLEDGE_USAGE_SCOPES } from "@/features/knowledge-base/knowledge-base-types";
import {
  FILTER_ENTRY_TYPES,
  getEntryStatusLabel,
  getEntryTypeLabel,
  getPriorityLabel,
} from "@/features/knowledge-base/knowledge-base-utils";

type Filters = {
  search: string;
  categoryId: string;
  type: string;
  status: string;
  usageScope: string;
  priority: string;
  verifiedOnly: boolean;
  needsImprovement: boolean;
};

type Props = {
  filters: Filters;
  onChange: (filters: Filters) => void;
};

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
        {FILTER_ENTRY_TYPES.map((type) => (
          <option key={type} value={type}>{getEntryTypeLabel(type)}</option>
        ))}
      </select>
      <select
        className="admin-input"
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
      >
        <option value="">Tất cả trạng thái</option>
        {(["DRAFT", "ACTIVE", "ARCHIVED"] as const).map((status) => (
          <option key={status} value={status}>{getEntryStatusLabel(status)}</option>
        ))}
      </select>
      <select
        className="admin-input"
        value={filters.usageScope}
        onChange={(e) => onChange({ ...filters, usageScope: e.target.value })}
      >
        <option value="">Tất cả mục đích</option>
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
        {(["HIGH", "MEDIUM", "LOW"] as const).map((priority) => (
          <option key={priority} value={priority}>{getPriorityLabel(priority)}</option>
        ))}
      </select>
      <label className="admin-radio-item">
        <input
          type="checkbox"
          checked={filters.verifiedOnly}
          onChange={(e) => onChange({ ...filters, verifiedOnly: e.target.checked })}
        />
        <span>Chỉ mục đã kiểm chứng</span>
      </label>
      <label className="admin-radio-item">
        <input
          type="checkbox"
          checked={filters.needsImprovement}
          onChange={(e) => onChange({ ...filters, needsImprovement: e.target.checked })}
        />
        <span>Chỉ hiển thị mục cần bổ sung</span>
      </label>
    </div>
  );
}
