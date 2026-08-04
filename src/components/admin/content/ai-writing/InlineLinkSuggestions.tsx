"use client";

import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";
import type { LinkSuggestion } from "@/features/content-generation/contracts/generation.types";

type Props = {
  suggestions: LinkSuggestion[];
  onInsert: (suggestion: LinkSuggestion) => void;
  onIgnore?: (suggestion: LinkSuggestion) => void;
  busy?: boolean;
};

/** Callback-only: Insert never auto-writes into section HTML — the editor confirms placement. */
export default function InlineLinkSuggestions({ suggestions, onInsert, onIgnore, busy = false }: Props) {
  if (suggestions.length === 0) {
    return <p className="admin-field-hint">Không có đề xuất liên kết nào.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {suggestions.map((s, idx) => (
        <li key={`${s.url}-${idx}`} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{s.anchorText}</p>
          <p className="admin-field-hint" style={{ margin: "2px 0", wordBreak: "break-all" }}>
            {s.url}
            {s.reason ? ` — ${s.reason}` : ""}
          </p>
          <div className={styles.panelActions}>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" disabled={busy} onClick={() => onInsert(s)}>
              Insert
            </button>
            {onIgnore && (
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" disabled={busy} onClick={() => onIgnore(s)}>
                Ignore
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
