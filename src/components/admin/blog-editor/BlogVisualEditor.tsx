"use client";

import { useRef, useState } from "react";
import BlogEditorPreview from "@/components/admin/blog-editor/BlogEditorPreview";
import BlogEditorToolbar from "@/components/admin/blog-editor/BlogEditorToolbar";
import { normalizePastedContent } from "@/features/blog/smart-paste";

type BlogVisualEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

type MobileTab = "edit" | "preview";

export default function BlogVisualEditor({ value, onChange }: BlogVisualEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("edit");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteDraft, setPasteDraft] = useState("");

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (text.trim()) onChange(normalizePastedContent(text));
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function applyPaste() {
    if (!pasteDraft.trim()) return;
    onChange(normalizePastedContent(pasteDraft));
    setPasteDraft("");
    setPasteOpen(false);
    setMobileTab("edit");
    textareaRef.current?.focus();
  }

  return (
    <div className="admin-visual-editor">
      <BlogEditorToolbar
        value={value}
        onChange={onChange}
        textareaRef={textareaRef}
        onImportMarkdown={() => fileInputRef.current?.click()}
        onPasteAi={() => {
          setPasteOpen((open) => !open);
          setPasteDraft("");
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        hidden
        onChange={handleImportFile}
      />

      {pasteOpen && (
        <div className="admin-blog-paste-panel">
          <p className="admin-field-hint">
            Dán markdown, HTML hoặc plain text từ Cursor. Hệ thống tự chuẩn hóa về markdown.
          </p>
          <textarea
            className="admin-textarea"
            rows={12}
            value={pasteDraft}
            onChange={(event) => setPasteDraft(event.target.value)}
            placeholder="# Tiêu đề bài viết..."
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

      <div className="admin-visual-editor-mobile-tabs">
        <button
          type="button"
          className={mobileTab === "edit" ? "is-active" : ""}
          onClick={() => setMobileTab("edit")}
        >
          Edit
        </button>
        <button
          type="button"
          className={mobileTab === "preview" ? "is-active" : ""}
          onClick={() => setMobileTab("preview")}
        >
          Preview
        </button>
      </div>

      <div className="admin-visual-editor-panels">
        <div
          className={`admin-visual-editor-pane admin-visual-editor-pane--edit ${
            mobileTab === "edit" ? "is-active" : ""
          }`}
        >
          <label className="admin-label">Markdown Editor</label>
          <textarea
            ref={textareaRef}
            className="admin-textarea admin-visual-editor-textarea"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Viết bài bằng markdown. Dùng toolbar để chèn heading, bảng, CTA, FAQ..."
          />
        </div>

        <div
          className={`admin-visual-editor-pane admin-visual-editor-pane--preview ${
            mobileTab === "preview" ? "is-active" : ""
          }`}
        >
          <label className="admin-label">Live Preview</label>
          <BlogEditorPreview markdown={value} />
        </div>
      </div>
    </div>
  );
}
