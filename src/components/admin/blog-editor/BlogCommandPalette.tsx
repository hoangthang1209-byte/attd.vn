"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PaletteCommand = {
  id: string;
  label: string;
  hint?: string;
  section: string;
  run: () => void;
};

type BlogCommandPaletteProps = {
  open: boolean;
  commands: PaletteCommand[];
  onClose: () => void;
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
}

export default function BlogCommandPalette({ open, commands, onClose }: BlogCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return commands;
    return commands.filter(
      (command) =>
        fold(command.label).includes(needle) ||
        fold(command.section).includes(needle) ||
        fold(command.hint ?? "").includes(needle),
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setQuery("");
      setCursor(0);
      inputRef.current?.focus();
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const active = results[Math.min(cursor, Math.max(0, results.length - 1))];

  function runCommand(command: PaletteCommand | undefined) {
    if (!command) return;
    onClose();
    command.run();
  }

  return (
    <div className="admin-command-palette" role="dialog" aria-modal="true" aria-label="Bảng lệnh">
      <button
        type="button"
        className="admin-command-palette__scrim"
        aria-label="Đóng bảng lệnh"
        onClick={onClose}
      />
      <div className="admin-command-palette__panel">
        <input
          ref={inputRef}
          className="admin-command-palette__input"
          value={query}
          placeholder="Tìm lệnh: publishing, focus, lưu…"
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setCursor((value) => Math.min(value + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setCursor((value) => Math.max(value - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              runCommand(active);
            }
          }}
        />

        <div className="admin-command-palette__list" role="listbox">
          {results.length === 0 ? (
            <p className="admin-command-palette__empty">Không có lệnh phù hợp.</p>
          ) : (
            results.map((command, index) => {
              const showSection = index === 0 || results[index - 1].section !== command.section;
              return (
                <div key={command.id}>
                  {showSection && (
                    <p className="admin-command-palette__section">{command.section}</p>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={command.id === active?.id}
                    className={`admin-command-palette__item ${
                      command.id === active?.id ? "is-active" : ""
                    }`}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => runCommand(command)}
                  >
                    <span>{command.label}</span>
                    {command.hint && (
                      <span className="admin-command-palette__hint">{command.hint}</span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <p className="admin-command-palette__footer">↑↓ chọn · Enter chạy · Esc đóng</p>
      </div>
    </div>
  );
}
