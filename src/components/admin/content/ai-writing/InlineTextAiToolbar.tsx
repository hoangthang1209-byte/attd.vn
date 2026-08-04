"use client";

import { useEffect, useState, type RefObject } from "react";
import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";

type ToolbarActionId = "rewrite" | "explain" | "simplify" | "professional" | "shorter" | "longer" | "example";

const ACTIONS: Array<{ id: ToolbarActionId; label: string; instruction: string }> = [
  { id: "rewrite", label: "Rewrite", instruction: "Viết lại đoạn văn bản được chọn cho rõ ràng và tự nhiên hơn." },
  { id: "explain", label: "Explain", instruction: "Giải thích rõ hơn ý nghĩa của đoạn được chọn cho khách hàng B2B." },
  { id: "simplify", label: "Simplify", instruction: "Đơn giản hoá đoạn được chọn, dùng câu ngắn và dễ hiểu." },
  { id: "professional", label: "Professional", instruction: "Viết lại đoạn được chọn theo giọng văn chuyên nghiệp hơn." },
  { id: "shorter", label: "Shorter", instruction: "Rút ngắn đoạn được chọn, giữ lại ý chính." },
  { id: "longer", label: "Longer", instruction: "Mở rộng đoạn được chọn với thêm chi tiết hữu ích." },
  { id: "example", label: "Add example", instruction: "Thêm một ví dụ minh hoạ cụ thể cho đoạn được chọn." },
];

type Props = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  disabledReason?: string;
  /** Fires SECTION_REWRITE-style instruction text + the selected substring. */
  onRequestRewrite: (instruction: string, selectedText: string) => void;
};

/**
 * P1: appears near the manual-edit textarea once the editor selects some
 * text inside it, offering quick inline AI actions on just that selection.
 * Always emits a SECTION_REWRITE editorInstruction — never writes directly.
 */
export default function InlineTextAiToolbar({ textareaRef, disabled = false, disabledReason, onRequestRewrite }: Props) {
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    // Reading `.current` here (inside the effect body, after commit) is
    // safe — the textarea this toolbar is meant to sit next to has already
    // mounted by the time this effect runs. Only the *dependency array*
    // must never read `.current` (that happens during render).
    const el = textareaRef.current;
    if (!el) return;

    function updateSelection() {
      if (!el) return;
      const text = el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0);
      setSelectedText(text.trim());
    }
    function clearSelection() {
      setSelectedText("");
    }

    el.addEventListener("select", updateSelection);
    el.addEventListener("mouseup", updateSelection);
    el.addEventListener("keyup", updateSelection);
    el.addEventListener("blur", clearSelection);
    return () => {
      el.removeEventListener("select", updateSelection);
      el.removeEventListener("mouseup", updateSelection);
      el.removeEventListener("keyup", updateSelection);
      el.removeEventListener("blur", clearSelection);
    };
    // Mount-once: this toolbar is always rendered alongside a freshly-mounted textarea.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!selectedText) return null;

  return (
    <div className={styles.inlineToolbar} role="toolbar" aria-label="AI cho đoạn đã chọn">
      {disabled ? (
        <span className="admin-field-hint">{disabledReason ?? "AI chưa được cấu hình."}</span>
      ) : (
        ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--xs"
            onClick={() => onRequestRewrite(action.instruction, selectedText)}
          >
            {action.label}
          </button>
        ))
      )}
    </div>
  );
}
