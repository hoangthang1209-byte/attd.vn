"use client";

import { useState } from "react";
import { tagToSlug } from "@/features/blog/content-processor";
import { normalizeBlogTags, parseTagDraft } from "@/features/blog/tags";

type BlogTagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

export default function BlogTagInput({ tags, onChange }: BlogTagInputProps) {
  const [draft, setDraft] = useState("");

  function addTags(raw: string) {
    const next = normalizeBlogTags([...tags, ...parseTagDraft(raw)]);
    onChange(next);
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((item) => item !== tag));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (draft.trim()) addTags(draft);
    }
    if (event.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="admin-tag-input">
      <div className="admin-tag-chip-list">
        {tags.map((tag) => (
          <span key={tag} className="admin-tag-chip">
            #{tagToSlug(tag)}
            <button type="button" onClick={() => removeTag(tag)} aria-label={`Xóa ${tag}`}>
              ×
            </button>
          </span>
        ))}
        <input
          className="admin-tag-chip-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (draft.trim()) addTags(draft);
          }}
          placeholder={tags.length === 0 ? "nguon hang, ao thun tron, OEM" : "Thêm tag..."}
        />
      </div>
      <p className="admin-field-hint">Nhấn Enter hoặc dấu phẩy để thêm tag.</p>
    </div>
  );
}
