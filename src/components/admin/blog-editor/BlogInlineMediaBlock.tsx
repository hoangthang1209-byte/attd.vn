"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ParsedInlineFigure } from "@/features/content/inline-media/parse-inline-media-figure";

export type InlineMediaBlockMeta = {
  locked: boolean;
  selectedBy: "SYSTEM" | "EDITOR";
  selectionReason: string | null;
  score: number | null;
};

type BlogInlineMediaBlockProps = {
  figure: ParsedInlineFigure;
  meta?: InlineMediaBlockMeta | null;
  compact?: boolean;
  onReplace: () => void;
  onToggleLock: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onVariantChange: (variant: ParsedInlineFigure["variant"]) => void;
  onCaptionChange: (caption: string) => void;
  onAltChange: (alt: string) => void;
};

function statusLabel(meta?: InlineMediaBlockMeta | null): string {
  if (meta?.locked) return "Đã khóa";
  if (meta?.selectedBy === "EDITOR") return "Biên tập viên chọn";
  if (meta?.selectedBy === "SYSTEM") return "Tự động chọn";
  return "Ảnh nội dung";
}

/**
 * Native accepted inline media block for the visual Blog editor.
 * Toolbar is hover/focus on desktop; explicit button on coarse pointers.
 */
export default function BlogInlineMediaBlock({
  figure,
  meta,
  compact = false,
  onReplace,
  onToggleLock,
  onRemove,
  onMoveUp,
  onMoveDown,
  onVariantChange,
  onCaptionChange,
  onAltChange,
}: BlogInlineMediaBlockProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editingAlt, setEditingAlt] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(figure.caption ?? "");
  const [altDraft, setAltDraft] = useState(figure.altText);
  const reasonId = useId();

  useEffect(() => {
    setCaptionDraft(figure.caption ?? "");
    setAltDraft(figure.altText);
  }, [figure.altText, figure.caption]);

  const closeToolbar = useCallback(() => setToolbarOpen(false), []);

  useEffect(() => {
    function onDocPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeToolbar();
    }
    document.addEventListener("mousedown", onDocPointer);
    return () => document.removeEventListener("mousedown", onDocPointer);
  }, [closeToolbar]);

  const missingAlt = !figure.altText.trim();

  return (
    <article
      ref={rootRef}
      className={`blog-inline-media-block ${compact ? "is-compact" : ""} ${meta?.locked ? "is-locked" : ""}`}
      tabIndex={0}
      aria-label={`Ảnh nội dung: ${figure.altText || "chưa có alt"}`}
      onFocus={() => setToolbarOpen(true)}
      onMouseEnter={() => setToolbarOpen(true)}
      onMouseLeave={() => {
        if (!editingAlt && !editingCaption && !showReason) setToolbarOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setToolbarOpen(false);
          setEditingAlt(false);
          setEditingCaption(false);
          setShowReason(false);
        }
      }}
    >
      <div className="blog-inline-media-block__frame">
        {figure.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={figure.src}
            alt={figure.altText || "Hình minh họa"}
            width={figure.width ?? undefined}
            height={figure.height ?? undefined}
            className={`blog-inline-media-block__img blog-inline-media-block__img--${figure.variant.toLowerCase()}`}
            loading="lazy"
          />
        ) : (
          <div className="blog-inline-media-block__ph" role="img" aria-label="Ảnh thiếu URL">
            Ảnh không có URL công khai
          </div>
        )}

        <span className="blog-inline-media-block__badge">{statusLabel(meta)}</span>

        <button
          type="button"
          className="blog-inline-media-block__menu"
          aria-expanded={toolbarOpen}
          aria-label="Mở công cụ ảnh"
          onClick={() => setToolbarOpen((open) => !open)}
        >
          ⋯
        </button>

        {toolbarOpen && (
          <div className="blog-inline-media-block__toolbar" role="toolbar" aria-label="Công cụ ảnh nội dung">
            <button type="button" onClick={onReplace}>
              Thay ảnh
            </button>
            <button type="button" onClick={onToggleLock}>
              {meta?.locked ? "Mở khóa" : "Khóa"}
            </button>
            <button type="button" onClick={onRemove} disabled={Boolean(meta?.locked)}>
              Xóa
            </button>
            <button type="button" onClick={onMoveUp}>
              Di chuyển lên
            </button>
            <button type="button" onClick={onMoveDown}>
              Di chuyển xuống
            </button>
            <label className="blog-inline-media-block__width">
              <span className="sr-only">Đổi chiều rộng</span>
              <select
                value={figure.variant}
                aria-label="Đổi chiều rộng"
                onChange={(event) =>
                  onVariantChange(event.target.value as ParsedInlineFigure["variant"])
                }
              >
                <option value="CONTENT_WIDTH">Content width</option>
                <option value="WIDE">Wide</option>
                <option value="FULL_WIDTH">Full width</option>
              </select>
            </label>
            <button type="button" onClick={() => setEditingCaption(true)}>
              Sửa caption
            </button>
            <button type="button" onClick={() => setEditingAlt(true)}>
              Sửa alt
            </button>
            <button
              type="button"
              aria-expanded={showReason}
              aria-controls={reasonId}
              onClick={() => setShowReason((open) => !open)}
            >
              Xem lý do chọn
            </button>
            <a
              className="blog-inline-media-block__library"
              href={`/admin/media?asset=${encodeURIComponent(figure.mediaAssetId)}`}
              target="_blank"
              rel="noreferrer"
            >
              Mở trong thư viện ảnh
            </a>
          </div>
        )}
      </div>

      {missingAlt && (
        <p className="blog-inline-media-block__warn" role="status">
          Ảnh này chưa có alt text.
        </p>
      )}

      {editingCaption ? (
        <div className="blog-inline-media-block__field">
          <label>
            Caption
            <input
              className="admin-input"
              value={captionDraft}
              onChange={(event) => setCaptionDraft(event.target.value)}
              onBlur={() => {
                onCaptionChange(captionDraft);
                setEditingCaption(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onCaptionChange(captionDraft);
                  setEditingCaption(false);
                }
              }}
              autoFocus
            />
          </label>
        </div>
      ) : figure.caption ? (
        <p className="blog-inline-media-block__caption">{figure.caption}</p>
      ) : null}

      {editingAlt && (
        <div className="blog-inline-media-block__field">
          <label>
            Alt text
            <input
              className="admin-input"
              value={altDraft}
              onChange={(event) => setAltDraft(event.target.value)}
              onBlur={() => {
                onAltChange(altDraft);
                setEditingAlt(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onAltChange(altDraft);
                  setEditingAlt(false);
                }
              }}
              autoFocus
            />
          </label>
        </div>
      )}

      {showReason && (
        <p id={reasonId} className="blog-inline-media-block__reason" role="status">
          {meta?.selectionReason || "Không có lý do chọn được ghi nhận."}
          {meta?.score != null ? ` · Điểm ${meta.score}` : ""}
        </p>
      )}
    </article>
  );
}
