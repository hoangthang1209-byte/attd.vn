"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import BlogBlockAssistant from "@/components/admin/blog-editor/BlogBlockAssistant";
import BlogDocumentStream from "@/components/admin/blog-editor/BlogDocumentStream";
import BlogEditorPreview from "@/components/admin/blog-editor/BlogEditorPreview";
import BlogInlineMediaPickerDrawer from "@/components/admin/blog-editor/BlogInlineMediaPickerDrawer";
import BlogMobileActionBar from "@/components/admin/blog-editor/BlogMobileActionBar";
import BlogOnboardingGuide from "@/components/admin/blog-editor/BlogOnboardingGuide";
import BlogQuickInsert from "@/components/admin/blog-editor/BlogQuickInsert";
import BlogSeoTemplatePicker from "@/components/admin/blog-editor/BlogSeoTemplatePicker";
import BlogSlashMenu from "@/components/admin/blog-editor/BlogSlashMenu";
import { filterEditorCommands } from "@/components/admin/blog-editor/editor-commands";
import {
  insertSnippetIntoMarkdown,
  replaceContentWithConfirmation,
} from "@/components/admin/blog-editor/editor-insert";
import { useBlogInlineMedia } from "@/components/admin/blog-editor/useBlogInlineMedia";
import { contentToEditorMarkdown } from "@/features/blog/html-to-markdown";
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
  focusMode?: boolean;
  postId?: string | null;
};

type MobileTab = "edit" | "preview";

export default function BlogVisualModeEditor({
  value,
  onChange,
  focusMode = false,
  postId = null,
}: BlogVisualModeEditorProps) {
  const blocks = useMemo(() => parseMarkdownBlocks(value), [value]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blockDraft, setBlockDraft] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("edit");
  const [appendDraft, setAppendDraft] = useState("");
  const [slashFilter, setSlashFilter] = useState<string | null>(null);
  const [slashCursor, setSlashCursor] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendRef = useRef<HTMLTextAreaElement>(null);
  const hiddenTextareaRef = useRef<HTMLTextAreaElement>(null);

  const applyEditorContent = useCallback(
    (next: string) => {
      // Apply APIs return HTML; convert so visual/markdown stay consistent.
      const looksHtml = /<\/?(?:p|h[1-6]|figure|div|ul|ol)\b/i.test(next);
      onChange(looksHtml ? contentToEditorMarkdown(next) : next);
    },
    [onChange],
  );

  const media = useBlogInlineMedia({
    postId,
    value,
    onChange: applyEditorContent,
    blocks,
  });

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
    [onChange, selectedBlock, value],
  );

  const insertTemplate = useCallback(
    (content: string) => {
      const next = replaceContentWithConfirmation(value, content);
      if (next !== null) onChange(next);
    },
    [onChange, value],
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
      document.getElementById(`inline-media-${block.id}`)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
  }, []);

  const commitBlockDraft = useCallback(() => {
    if (!selectedBlock) return;
    if (blockDraft === selectedBlock.raw) return;
    if (selectedBlock.type === "inline-media") return;
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
    (snippet: string, commandId?: string) => {
      if (commandId === "suggest-image" || commandId === "goi-y-anh") {
        void media.runPlan();
        setAppendDraft("");
        setSlashFilter(null);
        return;
      }
      const trimmed = appendDraft.replace(/\/[^\s]*$/, "").trim();
      if (trimmed) {
        insertSnippet(`${trimmed}\n\n${snippet}`);
      } else {
        insertSnippet(snippet);
      }
      setAppendDraft("");
      setSlashFilter(null);
      setSlashCursor(0);
      appendRef.current?.focus();
    },
    [appendDraft, insertSnippet, media],
  );

  const slashOpen = slashFilter !== null;
  const slashMatches = useMemo(
    () => (slashOpen ? filterEditorCommands(slashFilter ?? "") : []),
    [slashFilter, slashOpen],
  );

  const handleAppendKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (slashOpen && slashMatches.length > 0) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSlashCursor((index) => Math.min(index + 1, slashMatches.length - 1));
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSlashCursor((index) => Math.max(index - 1, 0));
          return;
        }
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          const command = slashMatches[Math.min(slashCursor, slashMatches.length - 1)];
          if (command) handleSlashSelect(command.snippet, command.id);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setSlashFilter(null);
          setSlashCursor(0);
          return;
        }
      }

      if (event.key === "Enter" && !event.shiftKey && !slashOpen) {
        event.preventDefault();
        handleAppendCommit();
      }
    },
    [handleAppendCommit, handleSlashSelect, slashCursor, slashMatches, slashOpen],
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
    [insertSnippet],
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
  const usedMediaIds = blocks
    .filter((block) => block.type === "inline-media")
    .map((block) => {
      const match = block.raw.match(/data-media-(?:asset-)?id=["']([^"']+)["']/i);
      return match?.[1] ?? "";
    })
    .filter(Boolean);

  const pickerBlock = media.pickerTarget?.blockId
    ? blocks.find((block) => block.id === media.pickerTarget?.blockId)
    : null;

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

      {!focusMode && (
        <div className="admin-visual-mode-toolbar">
          <BlogQuickInsert onInsert={insertSnippet} compact />
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
            <AdminLoadingButton
              variant="secondary"
              pending={media.busy}
              pendingLabel="Đang gợi ý…"
              onClick={() => void media.runPlan()}
            >
              Gợi ý ảnh
            </AdminLoadingButton>
          </div>
        </div>
      )}

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
      {media.message && !focusMode && (
        <p className="admin-message admin-message--success" role="status">
          {media.message}
        </p>
      )}

      {dragOver && (
        <div className="admin-visual-mode-drop-hint">Thả ảnh để upload và chèn vào bài viết</div>
      )}

      {!focusMode && (
        <div className="blog-inline-media-summary-bar">
          <button
            type="button"
            className="blog-inline-media-summary-bar__toggle"
            aria-expanded={!summaryCollapsed}
            onClick={() => setSummaryCollapsed((value) => !value)}
          >
            Ảnh trong nội dung · {media.summary.current}
            {media.summary.target != null ? ` / Khuyến nghị ${media.summary.target}` : ""}
          </button>
          {!summaryCollapsed && (
            <div className="blog-inline-media-summary-bar__body">
              <p>
                {media.summary.system} tự động · {media.summary.editor} biên tập viên ·{" "}
                {media.summary.locked} đã khóa
                {media.summary.missing > 0 ? ` · ${media.summary.missing} section còn thiếu` : ""}
              </p>
              <div className="blog-inline-media-summary-bar__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--small"
                  disabled={media.busy}
                  onClick={() => void media.runPlan()}
                >
                  Gợi ý ảnh còn thiếu
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--small"
                  onClick={() => {
                    const first = blocks.find((block) => block.type === "inline-media");
                    if (first) handleBlockSelect(first);
                  }}
                >
                  Xem tất cả ảnh
                </button>
              </div>
            </div>
          )}
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
              {!focusMode && (
                <BlogBlockAssistant
                  blocks={blocks}
                  selectedBlockId={selectedBlockId}
                  onSelect={handleBlockSelect}
                  mediaSummary={{
                    suggestions: media.summary.suggestionCount,
                    accepted: media.summary.current,
                    locked: media.summary.locked,
                    ignored: media.ignored.length,
                  }}
                />
              )}

              <BlogDocumentStream
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                onSelect={handleBlockSelect}
                media={media}
                focusMode={focusMode}
              />

              {selectedBlock && selectedBlock.type !== "inline-media" && (
                <div className="admin-block-edit">
                  <label className="admin-label">
                    Chỉnh sửa {selectedBlock.label} — {selectedBlock.preview}
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
                placeholder="Gõ / để mở menu lệnh (ảnh, gợi ý ảnh, h2, faq…)"
                onChange={(event) => {
                  const next = event.target.value;
                  setAppendDraft(next);
                  const slashMatch = next.match(/\/([^\s]*)$/);
                  setSlashFilter(slashMatch ? slashMatch[1] : null);
                  setSlashCursor(0);
                }}
                onKeyDown={handleAppendKeyDown}
              />
              {slashFilter !== null && (
                <BlogSlashMenu
                  filter={slashFilter}
                  activeIndex={slashCursor}
                  onSelect={(snippet, commandId) => handleSlashSelect(snippet, commandId)}
                />
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

      <BlogInlineMediaPickerDrawer
        open={Boolean(media.pickerTarget)}
        sectionHeading={media.pickerTarget?.sectionHeading}
        usedMediaIds={usedMediaIds}
        onClose={() => media.setPickerTarget(null)}
        onSelect={(mediaAssetId) => {
          if (media.pickerTarget?.mode === "replace" && pickerBlock) {
            void media.replaceFigure(pickerBlock, mediaAssetId);
            return;
          }
          if (media.pickerTarget?.placement) {
            const placement = {
              ...media.pickerTarget.placement,
              block: {
                ...media.pickerTarget.placement.block,
                mediaAssetId,
                selectedBy: "EDITOR" as const,
                selectionReason: "Biên tập viên chọn từ thư viện",
              },
              candidate: {
                ...media.pickerTarget.placement.candidate,
                mediaAssetId,
              },
            };
            void media.acceptPlacement(placement);
            media.setPickerTarget(null);
          }
        }}
      />
    </div>
  );
}
