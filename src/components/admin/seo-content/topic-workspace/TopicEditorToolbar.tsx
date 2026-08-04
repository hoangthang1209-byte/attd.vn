"use client";

import styles from "@/components/admin/seo-content/topic-workspace/TopicWorkspace.module.css";

type Props = {
  saveStateLabel: string;
  draftVersion?: number | null;
  wordCount: number | null;
  outlineOpen: boolean;
  onToggleOutline: () => void;
  focus: boolean;
  onToggleFocus: () => void;
  onPreviewScroll: () => void;
  aiStatusLabel: string;
};

/** Sticky toolbar above the writing canvas — save state, outline/focus toggles, AI status. */
export default function TopicEditorToolbar({
  saveStateLabel,
  draftVersion,
  wordCount,
  outlineOpen,
  onToggleOutline,
  focus,
  onToggleFocus,
  onPreviewScroll,
  aiStatusLabel,
}: Props) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <span className={styles.toolbarPill}>{saveStateLabel}</span>
        {draftVersion != null && <span className={styles.toolbarPill}>Draft v{draftVersion}</span>}
        <span className={styles.toolbarPill}>{wordCount != null ? `${wordCount} từ` : "— từ"}</span>
      </div>
      <div className={styles.toolbarRight}>
        <button
          type="button"
          className={`${styles.toolbarButton} ${outlineOpen ? styles.toolbarButtonActive : ""}`}
          aria-pressed={outlineOpen}
          onClick={onToggleOutline}
        >
          Dàn ý
        </button>
        <button type="button" className={styles.toolbarButton} onClick={onPreviewScroll}>
          Xem trước
        </button>
        <button
          type="button"
          className={`${styles.toolbarButton} ${focus ? styles.toolbarButtonActive : ""}`}
          aria-pressed={focus}
          onClick={onToggleFocus}
        >
          {focus ? "Thoát Focus" : "Focus mode"}
        </button>
        <span className={styles.toolbarDivider} aria-hidden />
        <span className={styles.toolbarPill}>{aiStatusLabel}</span>
      </div>
    </div>
  );
}
