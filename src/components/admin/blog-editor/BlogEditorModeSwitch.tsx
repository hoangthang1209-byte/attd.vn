"use client";

import type { BlogEditorMode } from "@/features/blog/editor-storage";

type BlogEditorModeSwitchProps = {
  mode: BlogEditorMode;
  onChange: (mode: BlogEditorMode) => void;
};

export default function BlogEditorModeSwitch({ mode, onChange }: BlogEditorModeSwitchProps) {
  return (
    <div className="admin-editor-mode-switch" role="tablist" aria-label="Chế độ editor">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "visual"}
        className={mode === "visual" ? "is-active" : ""}
        onClick={() => onChange("visual")}
      >
        Visual
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "markdown"}
        className={mode === "markdown" ? "is-active" : ""}
        onClick={() => onChange("markdown")}
      >
        Markdown
      </button>
    </div>
  );
}
