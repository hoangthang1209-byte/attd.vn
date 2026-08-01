"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EDITOR_PREF_KEYS,
  pushRecent,
  readListPref,
  toggleInList,
  writeListPref,
} from "@/features/blog/editor-preferences";
import type { ContentBlock } from "@/features/blog/block-parser";

type BlogBlockAssistantProps = {
  blocks: ContentBlock[];
  selectedBlockId: string | null;
  onSelect: (block: ContentBlock) => void;
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
}

/**
 * Collapsible drawer: the outline stays one row tall until the editor asks for
 * it. Pinned and recent blocks float to the top so long articles stay
 * navigable without scrolling the whole outline.
 */
export default function BlogBlockAssistant({
  blocks,
  selectedBlockId,
  onSelect,
}: BlogBlockAssistantProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pinned, setPinned] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setPinned(readListPref(EDITOR_PREF_KEYS.pinnedBlocks));
      setRecent(readListPref(EDITOR_PREF_KEYS.recentBlocks));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = useCallback(
    (block: ContentBlock) => {
      setRecent((current) => {
        const next = pushRecent(current, block.id);
        writeListPref(EDITOR_PREF_KEYS.recentBlocks, next);
        return next;
      });
      onSelect(block);
    },
    [onSelect],
  );

  const togglePin = useCallback((blockId: string) => {
    setPinned((current) => {
      const next = toggleInList(current, blockId);
      writeListPref(EDITOR_PREF_KEYS.pinnedBlocks, next);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return blocks;
    return blocks.filter(
      (block) => fold(block.label).includes(needle) || fold(block.preview).includes(needle),
    );
  }, [blocks, query]);

  const pinnedBlocks = useMemo(
    () => filtered.filter((block) => pinned.includes(block.id)),
    [filtered, pinned],
  );
  const recentBlocks = useMemo(
    () =>
      recent
        .map((id) => filtered.find((block) => block.id === id))
        .filter((block): block is ContentBlock => Boolean(block) && !pinned.includes(block!.id)),
    [filtered, pinned, recent],
  );

  if (blocks.length === 0) {
    return (
      <div className="admin-block-assistant admin-block-assistant--empty">
        <p className="admin-block-assistant-title">Block Assistant</p>
        <p className="admin-field-hint">Thêm nội dung để xem outline các khối.</p>
      </div>
    );
  }

  const selectedIndex = blocks.findIndex((block) => block.id === selectedBlockId);

  function renderRow(block: ContentBlock) {
    return (
      <li key={block.id}>
        <div className="admin-block-assistant-row">
          <button
            type="button"
            className={`admin-block-assistant-item ${
              selectedBlockId === block.id ? "is-active" : ""
            }`}
            onClick={() => handleSelect(block)}
          >
            <span className="admin-block-assistant-tag">{block.label}</span>
            <span className="admin-block-assistant-preview">{block.preview}</span>
          </button>
          <button
            type="button"
            className={`admin-block-assistant-pin ${pinned.includes(block.id) ? "is-pinned" : ""}`}
            aria-pressed={pinned.includes(block.id)}
            aria-label={pinned.includes(block.id) ? "Bỏ ghim khối" : "Ghim khối"}
            onClick={() => togglePin(block.id)}
          >
            ★
          </button>
        </div>
      </li>
    );
  }

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
          <input
            className="admin-input admin-input--small"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm khối theo tiêu đề hoặc nội dung…"
            aria-label="Tìm khối nội dung"
          />

          {pinnedBlocks.length > 0 && (
            <>
              <p className="admin-block-assistant__group">Pinned</p>
              <ul className="admin-block-assistant-list">{pinnedBlocks.map(renderRow)}</ul>
            </>
          )}

          {recentBlocks.length > 0 && (
            <>
              <p className="admin-block-assistant__group">Recent</p>
              <ul className="admin-block-assistant-list">{recentBlocks.map(renderRow)}</ul>
            </>
          )}

          <p className="admin-block-assistant__group">
            {query.trim() ? `Kết quả (${filtered.length})` : "Outline"}
          </p>
          {filtered.length === 0 ? (
            <p className="admin-field-hint">Không có khối phù hợp.</p>
          ) : (
            <ul className="admin-block-assistant-list">{filtered.map(renderRow)}</ul>
          )}
        </div>
      )}
    </div>
  );
}
