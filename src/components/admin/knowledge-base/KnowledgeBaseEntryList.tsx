"use client";

import type { KnowledgeBaseEntryRecord } from "@/features/knowledge-base/knowledge-base-types";
import KnowledgeBaseEntryCard from "@/components/admin/knowledge-base/KnowledgeBaseEntryCard";

type Props = {
  entries: KnowledgeBaseEntryRecord[];
  onChanged: () => void;
  selectedIds: string[];
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
};

export default function KnowledgeBaseEntryList({
  entries,
  onChanged,
  selectedIds,
  onSelect,
  onSelectAll,
}: Props) {
  const allSelected = entries.length > 0 && selectedIds.length === entries.length;

  return (
    <div className="admin-kb-entry-list">
      <label className="admin-radio-item admin-kb-select-all">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => onSelectAll(e.target.checked)}
        />
        <span>Chọn tất cả ({entries.length})</span>
      </label>
      <div className="admin-kb-entry-grid">
        {entries.map((entry) => (
          <KnowledgeBaseEntryCard
            key={entry.id}
            entry={entry}
            onChanged={onChanged}
            selected={selectedIds.includes(entry.id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
