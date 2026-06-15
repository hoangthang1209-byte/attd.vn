"use client";

import type { KnowledgeBaseEntryType } from "@prisma/client";
import { buildCompletenessChecklist } from "@/features/knowledge-base/knowledge-base-completeness-checklist";

type Props = {
  title: string;
  summary: string;
  content: string;
  categoryId: string;
  tags: string[];
  type: KnowledgeBaseEntryType;
  structuredData: Record<string, unknown> | null;
  isVerified: boolean;
};

export default function KnowledgeBaseCompletenessPanel(props: Props) {
  const checklist = buildCompletenessChecklist({
    title: props.title,
    summary: props.summary || null,
    content: props.content || null,
    categoryId: props.categoryId,
    tags: props.tags,
    structuredData: props.structuredData,
    type: props.type,
    isVerified: props.isVerified,
  });

  return (
    <div className="admin-kb-completeness">
      <h4 className="admin-kb-completeness-title">Kiểm tra dữ liệu</h4>
      <p className="admin-kb-completeness-score">
        {checklist.score}/100 — {checklist.label}
      </p>
      <ul className="admin-kb-completeness-list">
        {checklist.items.map((item) => (
          <li key={item.id} className={item.ok ? "is-ok" : item.warning ? "is-warn" : "is-missing"}>
            {item.ok ? "✓" : item.warning ? "⚠" : "○"} {item.label}
          </li>
        ))}
      </ul>
      {checklist.warnings.length > 0 && (
        <ul className="admin-kb-warning-list">
          {checklist.warnings.map((warning) => (
            <li key={warning}>⚠ {warning}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
