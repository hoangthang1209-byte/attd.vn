"use client";

import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";
import type { MediaSuggestion } from "@/features/content-generation/contracts/generation.types";

type Props = {
  suggestions: MediaSuggestion[];
  onAccept: (suggestion: MediaSuggestion) => void;
  onReplace?: (suggestion: MediaSuggestion) => void;
  onIgnore?: (suggestion: MediaSuggestion) => void;
  busy?: boolean;
};

/**
 * Accept-only semantics (Sprint 16.0): Accept notifies the parent callback,
 * it never auto-inserts into MediaAsset/media-placement tables. Replace and
 * Ignore are also callback-only — editors still finish the media placement
 * manually.
 */
export default function InlineMediaSuggestions({ suggestions, onAccept, onReplace, onIgnore, busy = false }: Props) {
  if (suggestions.length === 0) {
    return <p className="admin-field-hint">Không có đề xuất hình ảnh nào.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {suggestions.map((s, idx) => (
        <li key={`${s.mediaAssetId}-${idx}`} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
            {s.mediaAssetId.slice(0, 10)}… · {s.placement}
          </p>
          <p className="admin-field-hint" style={{ margin: "2px 0" }}>
            {s.altText}
            {s.reason ? ` — ${s.reason}` : ""}
          </p>
          <div className={styles.panelActions}>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" disabled={busy} onClick={() => onAccept(s)}>
              Accept
            </button>
            {onReplace && (
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" disabled={busy} onClick={() => onReplace(s)}>
                Replace
              </button>
            )}
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
