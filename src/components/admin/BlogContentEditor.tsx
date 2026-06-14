"use client";

import { useRef, useState } from "react";
import { isHtmlContent, markdownToHtml } from "@/features/blog/markdown";

type BlogContentEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function BlogContentEditor({ value, onChange }: BlogContentEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteDraft, setPasteDraft] = useState("");

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (text.trim()) onChange(text.trim());
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function applyPaste() {
    if (!pasteDraft.trim()) return;
    onChange(pasteDraft.trim());
    setPasteDraft("");
    setPasteOpen(false);
  }

  const previewHtml = preview
    ? isHtmlContent(value)
      ? value
      : markdownToHtml(value)
    : "";

  return (
    <div className="admin-blog-editor">
      <div className="admin-blog-editor-toolbar">
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          Import Markdown
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={() => {
            setPasteOpen((open) => !open);
            setPasteDraft("");
          }}
        >
          Paste AI Article
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? "Edit" : "Preview"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          hidden
          onChange={handleImportFile}
        />
      </div>

      {pasteOpen && (
        <div className="admin-blog-paste-panel">
          <p className="admin-field-hint">
            Dán markdown từ Cursor. Nội dung sẽ được chuyển sang HTML khi lưu.
          </p>
          <textarea
            className="admin-textarea"
            rows={12}
            value={pasteDraft}
            onChange={(e) => setPasteDraft(e.target.value)}
            placeholder="# Tiêu đề bài viết&#10;&#10;Nội dung markdown..."
          />
          <div className="admin-form-actions">
            <button type="button" className="admin-btn" onClick={applyPaste}>
              Áp dụng
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => setPasteOpen(false)}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {preview ? (
        <div
          className="admin-blog-preview prose-blog"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      ) : (
        <textarea
          className="admin-textarea admin-textarea--tall"
          rows={20}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Markdown hoặc HTML. Hỗ trợ headings, lists, tables, links, images, code blocks."
        />
      )}
    </div>
  );
}
