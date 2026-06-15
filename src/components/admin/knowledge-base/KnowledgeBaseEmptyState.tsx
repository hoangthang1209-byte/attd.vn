"use client";

import KnowledgeBaseStarterImport from "@/components/admin/knowledge-base/KnowledgeBaseStarterImport";

type Props = { onImported: () => void };

export default function KnowledgeBaseEmptyState({ onImported }: Props) {
  return (
    <div className="admin-kb-empty">
      <h2 className="admin-subtitle">Chưa có dữ liệu doanh nghiệp</h2>
      <p className="admin-field-hint">
        Tạo dữ liệu mẫu ATTD hoặc thêm entry thủ công để bắt đầu xây Knowledge Base.
      </p>
      <KnowledgeBaseStarterImport onImported={onImported} />
    </div>
  );
}
