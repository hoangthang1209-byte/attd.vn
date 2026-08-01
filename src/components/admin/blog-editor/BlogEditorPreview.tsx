"use client";

import { memo, useMemo, useState } from "react";
import { renderBlogPreviewFromMarkdown } from "@/features/blog/preview-content";

type PreviewDevice = "desktop" | "tablet" | "mobile";

type BlogEditorPreviewProps = {
  markdown: string;
};

const DEVICES: Array<{ id: PreviewDevice; label: string; width: string }> = [
  { id: "desktop", label: "Desktop", width: "100%" },
  { id: "tablet", label: "Tablet", width: "768px" },
  { id: "mobile", label: "Mobile", width: "390px" },
];

/**
 * Device switching only changes the viewport width — the HTML comes from the
 * same `renderBlogPreviewFromMarkdown` the public article uses, so there is
 * still exactly one render pipeline.
 */
function BlogEditorPreview({ markdown }: BlogEditorPreviewProps) {
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const html = useMemo(() => renderBlogPreviewFromMarkdown(markdown), [markdown]);
  const width = DEVICES.find((item) => item.id === device)?.width ?? "100%";

  return (
    <div className="admin-preview-frame">
      <div className="admin-preview-devices" role="group" aria-label="Kích thước xem trước">
        {DEVICES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-preview-device ${device === item.id ? "is-active" : ""}`}
            aria-pressed={device === item.id}
            onClick={() => setDevice(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={`admin-preview-stage admin-preview-stage--${device}`}>
        {markdown.trim() ? (
          <div
            className="admin-visual-editor-preview prose-blog prose-blog--article"
            style={{ maxWidth: width }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div
            className="admin-visual-editor-preview admin-visual-editor-preview--empty"
            style={{ maxWidth: width }}
          >
            <p>Xem trước nội dung sẽ hiển thị ở đây.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Memoized: the preview re-renders only when the markdown actually changes. */
export default memo(BlogEditorPreview);
