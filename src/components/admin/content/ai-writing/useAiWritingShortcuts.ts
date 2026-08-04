"use client";

import { useEffect } from "react";

export const AI_SECTION_ACTIVE_ATTR = "data-ai-section-active";

type ShortcutHandlers = {
  onOpenMenu?: () => void;
  onGenerateOrApply?: () => void;
  onEscape?: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable === true;
}

function isWithinActiveAiSection(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el?.closest?.(`[${AI_SECTION_ACTIVE_ATTR}="true"]`));
}

/**
 * Panel-level keyboard shortcuts for the AI writing experience:
 *  - Cmd/Ctrl+J: open the AI menu for the focused/active section.
 *  - Cmd/Ctrl+Enter: generate (no proposal yet) or apply (proposal focused).
 *  - Esc: cancel a running generation / close an open proposal or menu.
 *
 * Respects normal typing: shortcuts inside inputs/textareas/contentEditable
 * only fire when the focused element sits inside an element marked
 * `data-ai-section-active="true"` — every other field is left alone.
 */
export function useAiWritingShortcuts(active: boolean, handlers: ShortcutHandlers): void {
  useEffect(() => {
    if (!active) return;

    function onKeyDown(e: KeyboardEvent) {
      const typing = isTypingTarget(e.target);
      const withinActiveSection = isWithinActiveAiSection(e.target);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        if (!typing || withinActiveSection) {
          e.preventDefault();
          handlers.onOpenMenu?.();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (withinActiveSection || !typing) {
          e.preventDefault();
          handlers.onGenerateOrApply?.();
        }
        return;
      }

      if (e.key === "Escape" && withinActiveSection) {
        handlers.onEscape?.();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, handlers]);
}
