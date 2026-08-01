"use client";

import { useMemo, useState } from "react";
import { tagToSlug } from "@/features/blog/content-processor";
import { normalizeBlogTags, parseTagDraft } from "@/features/blog/tags";

type BlogTagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

/** Tags above this count collapse behind a search box instead of a chip wall. */
const COLLAPSE_THRESHOLD = 6;

export default function BlogTagInput({ tags, onChange }: BlogTagInputProps) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const collapsed = tags.length > COLLAPSE_THRESHOLD && !expanded;
  const visible = useMemo(() => {
    if (collapsed) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return tags;
    return tags.filter((tag) => tag.toLowerCase().includes(needle));
  }, [collapsed, search, tags]);

  function addTags(raw: string) {
    onChange(normalizeBlogTags([...tags, ...parseTagDraft(raw)]));
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
      {tags.length > COLLAPSE_THRESHOLD && (
        <div className="admin-tag-input__bar">
          <button
            type="button"
            className="admin-tag-input__toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {tags.length} Tags <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
          </button>
          {expanded && (
            <input
              className="admin-input admin-input--small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tag…"
              aria-label="Tìm trong tags"
            />
          )}
        </div>
      )}

      {!collapsed && (
        <div className="admin-tag-chip-list">
          {visible.map((tag) => (
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
      )}

      {!collapsed && (
        <p className="admin-field-hint">Nhấn Enter hoặc dấu phẩy để thêm tag.</p>
      )}
    </div>
  );
}
