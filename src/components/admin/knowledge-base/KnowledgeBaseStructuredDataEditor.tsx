"use client";

import { useState } from "react";

type Props = {
  value: Record<string, unknown> | null;
  onChange: (value: Record<string, unknown> | null) => void;
};

export default function KnowledgeBaseStructuredDataEditor({ value, onChange }: Props) {
  const [raw, setRaw] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);

  function applyRaw() {
    try {
      const parsed = raw.trim() ? JSON.parse(raw) : {};
      if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
        setError("Dữ liệu chi tiết phải là object.");
        return;
      }
      setError(null);
      onChange(parsed as Record<string, unknown>);
    } catch {
      setError("Không thể đọc dữ liệu chi tiết.");
    }
  }

  return (
    <div className="admin-kb-structured">
      <p className="admin-field-hint">
        Thêm thông tin chi tiết như chất liệu, MOQ, màu sắc, use case…
      </p>
      <textarea
        className="admin-textarea"
        rows={8}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={applyRaw}
      />
      {error && <p className="admin-error">{error}</p>}
      <details className="admin-ai-factory-advanced">
        <summary>Nâng cao</summary>
        <p className="admin-field-hint">Chỉnh sửa dạng JSON nếu cần cấu trúc phức tạp hơn.</p>
      </details>
    </div>
  );
}
