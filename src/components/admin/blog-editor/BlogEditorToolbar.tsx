"use client";

import { useRef } from "react";
import BlogEditorMediaInsert from "@/components/admin/blog-editor/BlogEditorMediaInsert";
import { EDITOR_SNIPPETS, insertAtCursor } from "@/components/admin/blog-editor/editor-snippets";

type BlogEditorToolbarProps = {
  value: string;
  onChange: (value: string) => void;
  onImportMarkdown: () => void;
  onPasteAi: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

export default function BlogEditorToolbar({
  value,
  onChange,
  onImportMarkdown,
  onPasteAi,
  textareaRef,
}: BlogEditorToolbarProps) {
  function insertSnippet(snippet: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${snippet}`);
      return;
    }
    onChange(insertAtCursor(textarea, value, snippet));
  }

  function insertImage(url: string, altText: string) {
    insertSnippet(`![${altText}](${url})\n\n`);
  }

  return (
    <div className="admin-visual-editor-toolbar">
      <div className="admin-visual-editor-toolbar-group">
        {EDITOR_SNIPPETS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="admin-visual-editor-tool"
            onClick={() => insertSnippet(item.snippet)}
            title={item.label}
          >
            {item.label}
          </button>
        ))}
        <BlogEditorMediaInsert onInsert={insertImage} />
      </div>

      <div className="admin-visual-editor-toolbar-group admin-visual-editor-toolbar-group--secondary">
        <button type="button" className="admin-visual-editor-tool" onClick={onImportMarkdown}>
          Import Markdown
        </button>
        <button type="button" className="admin-visual-editor-tool" onClick={onPasteAi}>
          Paste AI Article
        </button>
      </div>
    </div>
  );
}
