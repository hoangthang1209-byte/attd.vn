"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EDITOR_COMMAND_GROUP_LABELS,
  filterEditorCommands,
  type EditorCommand,
} from "@/components/admin/blog-editor/editor-commands";

type BlogSlashMenuProps = {
  filter: string;
  onSelect: (snippet: string) => void;
  /** Reported so the host textarea can hand arrow keys to the menu. */
  onActiveChange?: (command: EditorCommand | null) => void;
  activeIndex?: number;
};

export default function BlogSlashMenu({
  filter,
  onSelect,
  onActiveChange,
  activeIndex = 0,
}: BlogSlashMenuProps) {
  const items = useMemo(() => filterEditorCommands(filter), [filter]);
  const [hovered, setHovered] = useState<number | null>(null);
  const current = items.length > 0 ? items[Math.min(activeIndex, items.length - 1)] : null;

  useEffect(() => {
    onActiveChange?.(current ?? null);
  }, [current, onActiveChange]);

  if (items.length === 0) {
    return (
      <div className="admin-slash-menu admin-slash-menu--empty" role="listbox">
        <p className="admin-slash-menu__empty">Không có lệnh phù hợp “{filter}”.</p>
      </div>
    );
  }

  return (
    <div className="admin-slash-menu" role="listbox" aria-label="Lệnh chèn nội dung">
      {items.map((item, index) => {
        const showGroup = index === 0 || items[index - 1].group !== item.group;
        const active = index === Math.min(activeIndex, items.length - 1) || index === hovered;

        return (
          <div key={item.id}>
            {showGroup && (
              <p className="admin-slash-menu__group">{EDITOR_COMMAND_GROUP_LABELS[item.group]}</p>
            )}
            <button
              type="button"
              role="option"
              aria-selected={active}
              className={`admin-slash-menu-item ${active ? "is-active" : ""}`}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(item.snippet);
              }}
            >
              <span className="admin-slash-menu-item__label">{item.label}</span>
              <span className="admin-slash-menu-item__hint">{item.hint}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
