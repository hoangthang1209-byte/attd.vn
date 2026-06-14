"use client";

import { useMemo } from "react";
import { renderBlogPreviewFromMarkdown } from "@/features/blog/preview-content";

type BlogEditorPreviewProps = {
  markdown: string;
};

export default function BlogEditorPreview({ markdown }: BlogEditorPreviewProps) {
  const html = useMemo(() => renderBlogPreviewFromMarkdown(markdown), [markdown]);

  if (!markdown.trim()) {
    return (
      <div className="admin-visual-editor-preview admin-visual-editor-preview--empty">
        <p>Xem trước nội dung sẽ hiển thị ở đây.</p>
      </div>
    );
  }

  return (
    <div
      className="admin-visual-editor-preview prose-blog prose-blog--article"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
