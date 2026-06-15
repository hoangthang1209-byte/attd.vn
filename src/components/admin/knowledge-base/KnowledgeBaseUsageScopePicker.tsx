"use client";

import { useState } from "react";
import { KNOWLEDGE_USAGE_SCOPES } from "@/features/knowledge-base/knowledge-base-types";

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
};

export default function KnowledgeBaseUsageScopePicker({ value, onChange }: Props) {
  function toggle(scope: string) {
    onChange(value.includes(scope) ? value.filter((s) => s !== scope) : [...value, scope]);
  }

  return (
    <div className="admin-kb-scope-grid">
      {KNOWLEDGE_USAGE_SCOPES.map((scope) => (
        <label key={scope.id} className="admin-radio-item admin-kb-scope-item">
          <input
            type="checkbox"
            checked={value.includes(scope.id)}
            onChange={() => toggle(scope.id)}
          />
          <span>{scope.label}</span>
        </label>
      ))}
    </div>
  );
}
