"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import BlogBlockAssistant from "@/components/admin/blog-editor/BlogBlockAssistant";
import BlogEditorPreview from "@/components/admin/blog-editor/BlogEditorPreview";
import BlogMobileActionBar from "@/components/admin/blog-editor/BlogMobileActionBar";
import BlogOnboardingGuide from "@/components/admin/blog-editor/BlogOnboardingGuide";
import BlogQuickInsert from "@/components/admin/blog-editor/BlogQuickInsert";
import BlogSeoTemplatePicker from "@/components/admin/blog-editor/BlogSeoTemplatePicker";
import BlogSlashMenu from "@/components/admin/blog-editor/BlogSlashMenu";
import {
  insertSnippetIntoMarkdown,
  replaceContentWithConfirmation,
} from "@/components/admin/blog-editor/editor-insert";
import { CTA_BLOCK_SNIPPET, FAQ_BLOCK_SNIPPET } from "@/features/blog/seo-blocks";
import { SEO_ARTICLE_STARTER } from "@/features/blog/seo-templates";
import {
  parseMarkdownBlocks,
  replaceBlock,
  type ContentBlock,
} from "@/features/blog/block-parser";
import {
  isImageFile,
  uploadBlogImage,
} from "@/components/admin/blog-editor/blog-image-upload";

type BlogVisualModeEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

type MobileTab = "edit" | "preview";

export default function BlogVisualModeEditor({ value, onChange }: BlogVisualModeEditorProps) {
  const blocks = useMemo(() => parseMarkdownBlocks(value), [value]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blockDraft, setBlockDraft] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("edit");
  const [appendDraft, setAppendDraft] = useState("");
  const [slashFilter, setSlashFilter] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendRef = useRef<HTMLTextAreaElement>(null);
  const hiddenTextareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;

  useEffect(() => {
    if (selectedBlock) {
      setBlockDraft(selectedBlock.raw);
    } else {
      setBlockDraft("");
    }
  }, [selectedBlock]);

  const insertSnippet = useCallback(
    (snippet: string) => {
      onChange(insertSnippetIntoMarkdown(value, snippet, selectedBlock));
      setMobileTab("edit");
    },
    [onChange, selectedBlock, value]
  );

  const insertTemplate = useCallback(
    (content: string) => {
      const next = replaceContentWithConfirmation(value, content);
      if (next !== null) onChange(next);
    },
    [onChange, value]
  );

  const insertSeoStarter = useCallback(() => {
    const next = replaceContentWithConfirmation(value, SEO_ARTICLE_STARTER, true);
    if (next !== null) onChange(next);
  }, [onChange, value]);

  const handleBlockSelect = useCallback((block: ContentBlock) => {
    setSelectedBlockId(block.id);
    setMobileTab("edit");
    requestAnimationFrame(() => {
      if (hiddenTextareaRef.current) {
        hiddenTextareaRef.current.focus();
        hiddenTextareaRef.current.setSelectionRange(block.start, block.end);
      }
    });
  }, []);

  const commitBlockDraft = useCallback(() => {
    if (!selectedBlock) return;
    if (blockDraft === selectedBlock.raw) return;
    const next = replaceBlock(value, selectedBlock, blockDraft);
    onChange(next);
  }, [blockDraft, onChange, selectedBlock, value]);

  const handleAppendCommit = useCallback(() => {
    const trimmed = appendDraft.trim();
    if (!trimmed) return;
    insertSnippet(`${trimmed}\n\n`);
    setAppendDraft("");
    setSlashFilter(null);
  }, [appendDraft, insertSnippet]);

  const handleSlashSelect = useCallback(
    (snippet: string) => {
      const trimmed = appendDraft.replace(/\/[^\s]*$/, "").trim();
      if (trimmed) {
        insertSnippet(`${trimmed}\n\n${snippet}`);
      } else {
        insertSnippet(snippet);
      }
      setAppendDraft("");
      setSlashFilter(null);
      appendRef.current?.focus();
    },
    [appendDraft, insertSnippet]
  );

  const handleImageFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter(isImageFile);
      if (imageFiles.length === 0) return;

      setUploadError(null);
      setUploading(true);
      try {
        for (const file of imageFiles) {
          const { url, altText } = await uploadBlogImage(file);
          insertSnippet(`![${altText}](${url})\n\n`);
        }
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload thất bại");
      } finally {
        setUploading(false);
      }
    },
    [insertSnippet]
  );

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        event.preventDefault();
        void handleImageFiles(imageFiles);
      }
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleImageFiles]);

  const isEmpty = !value.trim();

  return (
    <div
      className={`admin-visual-mode-editor ${dragOver ? "is-drag-over" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        if (event.dataTransfer.files.length > 0) {
          void handleImageFiles(event.dataTransfer.files);
        }
      }}
    >
      <textarea
        ref={hiddenTextareaRef}
        className="admin-visual-mode-hidden-textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        aria-hidden
      />

      <div className="admin-visual-mode-toolbar">
        <BlogQuickInsert onInsert={insertSnippet} />
        <div className="admin-visual-mode-toolbar-actions">
          <BlogSeoTemplatePicker onSelect={insertTemplate} />
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={insertSeoStarter}
          >
            Insert SEO Template
          </button>
          <AdminLoadingButton
            variant="secondary"
            pending={uploading}
            pendingLabel="Đang tải ảnh…"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload ảnh
          </AdminLoadingButton>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files?.length) void handleImageFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {uploadError && <p className="admin-message admin-message--error">{uploadError}</p>}

      {dragOver && (
        <div className="admin-visual-mode-drop-hint">Thả ảnh để upload và chèn vào bài viết</div>
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

      <div className="admin-visual-mode-panels">
        <div
          className={`admin-visual-mode-pane admin-visual-mode-pane--edit ${
            mobileTab === "edit" ? "is-active" : ""
          }`}
        >
          {isEmpty ? (
            <BlogOnboardingGuide />
          ) : (
            <>
              <BlogBlockAssistant
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                onSelect={handleBlockSelect}
              />

              {selectedBlock && (
                <div className="admin-block-edit">
                  <label className="admin-label">
                    Chỉnh sửa [{selectedBlock.label}] — {selectedBlock.preview}
                  </label>
                  <textarea
                    className="admin-textarea admin-block-edit-textarea"
                    rows={Math.min(12, Math.max(4, blockDraft.split("\n").length + 1))}
                    value={blockDraft}
                    onChange={(event) => setBlockDraft(event.target.value)}
                    onBlur={commitBlockDraft}
                  />
                  <p className="admin-field-hint">
                    Thay đổi được lưu khi rời khỏi ô chỉnh sửa. Markdown vẫn được giữ nguyên
                    trong pipeline.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="admin-visual-mode-append">
            <label className="admin-label">Thêm nội dung</label>
            <div className="admin-visual-mode-append-wrap">
              <textarea
                ref={appendRef}
                className="admin-textarea"
                rows={3}
                value={appendDraft}
                placeholder="Gõ / để mở menu lệnh (h2, faq, cta...)"
                onChange={(event) => {
                  const next = event.target.value;
                  setAppendDraft(next);
                  const slashMatch = next.match(/\/([^\s]*)$/);
                  setSlashFilter(slashMatch ? slashMatch[1] : null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && slashFilter === null) {
                    event.preventDefault();
                    handleAppendCommit();
                  }
                }}
              />
              {slashFilter !== null && (
                <BlogSlashMenu filter={slashFilter} onSelect={handleSlashSelect} />
              )}
            </div>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={handleAppendCommit}>
              Thêm vào bài
            </button>
          </div>
        </div>

        <div
          className={`admin-visual-mode-pane admin-visual-mode-pane--preview ${
            mobileTab === "preview" ? "is-active" : ""
          }`}
        >
          <label className="admin-label">Live Preview</label>
          <BlogEditorPreview markdown={value} />
        </div>
      </div>

      <BlogMobileActionBar
        onInsert={() => {
          setMobileTab("edit");
          appendRef.current?.focus();
        }}
        onImage={() => fileInputRef.current?.click()}
        onFaq={() => insertSnippet(`${FAQ_BLOCK_SNIPPET}\n\n`)}
        onCta={() => insertSnippet(`${CTA_BLOCK_SNIPPET}\n\n`)}
      />
    </div>
  );
}
