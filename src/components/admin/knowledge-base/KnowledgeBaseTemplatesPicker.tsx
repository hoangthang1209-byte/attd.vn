"use client";

import { KNOWLEDGE_BASE_TEMPLATES, type KnowledgeBaseTemplate } from "@/features/knowledge-base/knowledge-base-templates";

type Props = {
  onApply: (template: KnowledgeBaseTemplate) => void;
};

export default function KnowledgeBaseTemplatesPicker({ onApply }: Props) {
  return (
    <div className="admin-kb-templates">
      <p className="admin-field-hint">Mẫu nhanh</p>
      <div className="admin-kb-templates-grid">
        {KNOWLEDGE_BASE_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--small"
            onClick={() => onApply(template)}
          >
            {template.label}
          </button>
        ))}
      </div>
    </div>
  );
}
