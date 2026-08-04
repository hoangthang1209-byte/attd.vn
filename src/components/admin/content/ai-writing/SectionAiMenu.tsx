"use client";

import { useEffect, useRef } from "react";
import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";
import { AI_SECTION_MENU_ACTIONS, type AiSectionMenuActionId } from "@/features/content-generation/ux/ai-menu-actions";

type Props = {
  disabled: boolean;
  disabledReason?: string;
  onAction: (actionId: AiSectionMenuActionId) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Keep the trigger visible even without hover/focus (e.g. when a proposal is active). */
  forceVisible?: boolean;
  buttonId?: string;
  menuId?: string;
};

/**
 * Compact "✨ AI" trigger + dropdown mounted on a section row. Visible on
 * hover/focus so the writing surface stays visually primary; disabled with
 * an explanatory hint when the AI engine is off instead of hiding entirely
 * (so editors always know the feature exists and why it's unavailable).
 */
export default function SectionAiMenu({
  disabled,
  disabledReason,
  onAction,
  open,
  onOpenChange,
  forceVisible = false,
  buttonId = "ai-section-menu-trigger",
  menuId = "ai-section-menu-dropdown",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div className={styles.menuWrap} ref={wrapRef}>
      <button
        type="button"
        id={buttonId}
        className={`admin-btn admin-btn--secondary admin-btn--small ${styles.menuTrigger} ${
          forceVisible || open ? styles.menuTriggerVisible : ""
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={disabled ? disabledReason ?? "AI chưa sẵn sàng" : "Trợ lý AI cho section này"}
        onClick={() => onOpenChange(!open)}
      >
        ✨ AI
      </button>

      {open && (
        <div className={styles.menuDropdown} id={menuId} role="menu" aria-label="Hành động AI cho section">
          {disabled ? (
            <p className={styles.menuEmpty}>
              {disabledReason ?? "AI chưa được cấu hình. Bạn vẫn có thể viết và chỉnh sửa nội dung thủ công."}
            </p>
          ) : (
            AI_SECTION_MENU_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  onAction(action.id);
                  onOpenChange(false);
                }}
              >
                {action.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
