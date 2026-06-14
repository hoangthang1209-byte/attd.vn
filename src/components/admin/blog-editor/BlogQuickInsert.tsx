"use client";

import { QUICK_INSERT_SNIPPETS } from "@/components/admin/blog-editor/editor-snippets";

type BlogQuickInsertProps = {
  onInsert: (snippet: string) => void;
  compact?: boolean;
};

export default function BlogQuickInsert({ onInsert, compact = false }: BlogQuickInsertProps) {
  return (
    <div className={`admin-quick-insert ${compact ? "admin-quick-insert--compact" : ""}`}>
      {!compact && <p className="admin-quick-insert-label">Quick Insert</p>}
      <div className="admin-quick-insert-buttons">
        {QUICK_INSERT_SNIPPETS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="admin-quick-insert-btn"
            onClick={() => onInsert(item.snippet)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
