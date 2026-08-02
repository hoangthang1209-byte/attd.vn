"use client";

type BlogInlineMediaSuggestionProps = {
  heading: string;
  title: string | null;
  thumbnailUrl: string | null;
  score: number | null;
  reason: string | null;
  busy?: boolean;
  onAccept: () => void;
  onReplace: () => void;
  onIgnore: () => void;
};

/**
 * Non-persisted suggestion placeholder. Never rendered in public preview.
 */
export default function BlogInlineMediaSuggestion({
  heading,
  title,
  thumbnailUrl,
  score,
  reason,
  busy = false,
  onAccept,
  onReplace,
  onIgnore,
}: BlogInlineMediaSuggestionProps) {
  return (
    <aside
      className="blog-inline-media-suggestion"
      aria-label={`Gợi ý ảnh cho phần ${heading}`}
    >
      <p className="blog-inline-media-suggestion__eyebrow">Gợi ý ảnh cho phần này</p>
      <div className="blog-inline-media-suggestion__body">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="" className="blog-inline-media-suggestion__thumb" />
        ) : (
          <div className="blog-inline-media-suggestion__thumb is-empty" aria-hidden />
        )}
        <div className="blog-inline-media-suggestion__copy">
          <strong>{title || "Ảnh đề xuất"}</strong>
          <p>
            Phù hợp với: <em>{heading}</em>
          </p>
          {score != null && <p>Điểm phù hợp: {score}</p>}
          {reason && <p className="blog-inline-media-suggestion__reason">{reason}</p>}
        </div>
      </div>
      <div className="blog-inline-media-suggestion__actions">
        <button type="button" className="admin-btn admin-btn--primary admin-btn--small" disabled={busy} onClick={onAccept}>
          Chèn ảnh
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" disabled={busy} onClick={onReplace}>
          Thay ảnh
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" disabled={busy} onClick={onIgnore}>
          Bỏ qua
        </button>
      </div>
    </aside>
  );
}
