"use client";

import type { ContentBlock } from "@/features/blog/block-parser";

type BlogBlockAssistantProps = {
  blocks: ContentBlock[];
  selectedBlockId: string | null;
  onSelect: (block: ContentBlock) => void;
};

export default function BlogBlockAssistant({
  blocks,
  selectedBlockId,
  onSelect,
}: BlogBlockAssistantProps) {
  if (blocks.length === 0) {
    return (
      <div className="admin-block-assistant admin-block-assistant--empty">
        <p className="admin-block-assistant-title">Block Assistant</p>
        <p className="admin-field-hint">Thêm nội dung để xem outline các khối.</p>
      </div>
    );
  }

  return (
    <div className="admin-block-assistant">
      <p className="admin-block-assistant-title">Block Assistant</p>
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
              <span className="admin-block-assistant-tag">[{block.label}]</span>
              <span className="admin-block-assistant-preview">{block.preview}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
