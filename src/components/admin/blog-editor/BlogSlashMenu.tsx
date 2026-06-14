"use client";

import { SLASH_COMMANDS } from "@/components/admin/blog-editor/editor-snippets";

type BlogSlashMenuProps = {
  filter: string;
  onSelect: (snippet: string) => void;
};

export default function BlogSlashMenu({ filter, onSelect }: BlogSlashMenuProps) {
  const normalized = filter.trim().toLowerCase();
  const items = SLASH_COMMANDS.filter((item) =>
    normalized ? item.label.toLowerCase().includes(normalized) : true
  );

  if (items.length === 0) return null;

  return (
    <div className="admin-slash-menu" role="listbox">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="admin-slash-menu-item"
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(item.snippet);
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
