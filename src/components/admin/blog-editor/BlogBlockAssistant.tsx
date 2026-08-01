"use client";

import { useState } from "react";
import type { ContentBlock } from "@/features/blog/block-parser";

type BlogBlockAssistantProps = {
  blocks: ContentBlock[];
  selectedBlockId: string | null;
  onSelect: (block: ContentBlock) => void;
};

/**
 * Collapsible drawer: the outline is one row tall until the editor asks for
 * it, so the content pane stays the primary surface.
 */
export default function BlogBlockAssistant({
  blocks,
  selectedBlockId,
  onSelect,
}: BlogBlockAssistantProps) {
  const [open, setOpen] = useState(false);

  if (blocks.length === 0) {
    return (
      <div className="admin-block-assistant admin-block-assistant--empty">
        <p className="admin-block-assistant-title">Block Assistant</p>
        <p className="admin-field-hint">Thêm nội dung để xem outline các khối.</p>
      </div>
    );
  }

  const selectedIndex = blocks.findIndex((block) => block.id === selectedBlockId);

  return (
    <div className="admin-block-assistant admin-block-assistant--drawer">
      <button
        type="button"
        className="admin-block-assistant__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>Block Assistant · {blocks.length} khối</span>
        <span className="admin-block-assistant__count">
          {selectedIndex >= 0 ? `Đang chọn khối ${selectedIndex + 1}` : "Mở outline"}
          {open ? " ▲" : " ▼"}
        </span>
      </button>

      {open && (
        <div className="admin-block-assistant__body">
          <ul className="admin-block-assistant-list">
            {blocks.map((block) => (
              <li key={block.id}>
                <button
                  type="button"
                  className={`admin-block-assistant-item ${
                    selectedBlockId === block.id ? "is-active" : ""
                  }`}
                  onClick={() => onSelect(block)}
                >
                  <span className="admin-block-assistant-tag">{block.label}</span>
                  <span className="admin-block-assistant-preview">{block.preview}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
