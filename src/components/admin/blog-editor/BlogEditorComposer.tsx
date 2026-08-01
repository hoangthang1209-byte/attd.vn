"use client";

import { useEffect, useState } from "react";
import BlogEditorModeSwitch from "@/components/admin/blog-editor/BlogEditorModeSwitch";
import BlogMarkdownEditor from "@/components/admin/blog-editor/BlogMarkdownEditor";
import BlogVisualModeEditor from "@/components/admin/blog-editor/BlogVisualModeEditor";
import {
  getStoredEditorMode,
  setStoredEditorMode,
  type BlogEditorMode,
} from "@/features/blog/editor-storage";

type BlogEditorComposerProps = {
  value: string;
  onChange: (value: string) => void;
  /** Focus mode strips the editor down to the writing surface. */
  focusMode?: boolean;
};

export default function BlogEditorComposer({
  value,
  onChange,
  focusMode = false,
}: BlogEditorComposerProps) {
  const [mode, setMode] = useState<BlogEditorMode>("visual");

  useEffect(() => {
    setMode(getStoredEditorMode());
  }, []);

  function handleModeChange(next: BlogEditorMode) {
    setMode(next);
    setStoredEditorMode(next);
  }

  return (
    <div className="admin-blog-editor-composer">
      <div className="admin-blog-editor-composer-header">
        <BlogEditorModeSwitch mode={mode} onChange={handleModeChange} />
      </div>

      {mode === "markdown" ? (
        <BlogMarkdownEditor value={value} onChange={onChange} />
      ) : (
        <BlogVisualModeEditor value={value} onChange={onChange} focusMode={focusMode} />
      )}
    </div>
  );
}
