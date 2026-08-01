"use client";

import { useEffect } from "react";

type EditorShortcutHandlers = {
  onSave: () => void;
  onCommandPalette: () => void;
  onEscape: () => void;
};

/**
 * Workspace-level shortcuts. They deliberately run on the window so they work
 * while the caret sits in the editor, and they never swallow a browser default
 * we do not replace.
 */
export function useEditorShortcuts({
  onSave,
  onCommandPalette,
  onEscape,
}: EditorShortcutHandlers): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        onSave();
        return;
      }

      if (mod && event.key === "/") {
        event.preventDefault();
        onCommandPalette();
        return;
      }

      if (event.key === "Escape") {
        onEscape();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCommandPalette, onEscape, onSave]);
}
