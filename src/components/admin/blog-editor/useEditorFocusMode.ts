"use client";

import { useCallback, useEffect, useState } from "react";

/** Body flag the admin shell reads to hide its sidebar and header. */
const BODY_FLAG = "editorFocus";

/**
 * Focus mode is view-only state: it hides workspace chrome so the writer sees
 * title, summary and editor. Esc always returns to the normal layout.
 */
export function useEditorFocusMode(): {
  focus: boolean;
  setFocus: (next: boolean) => void;
  toggle: () => void;
} {
  const [focus, setFocusState] = useState(false);

  useEffect(() => {
    if (!focus) return;
    document.body.dataset[BODY_FLAG] = "on";
    return () => {
      delete document.body.dataset[BODY_FLAG];
    };
  }, [focus]);

  useEffect(() => {
    if (!focus) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFocusState(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focus]);

  const setFocus = useCallback((next: boolean) => setFocusState(next), []);
  const toggle = useCallback(() => setFocusState((value) => !value), []);

  return { focus, setFocus, toggle };
}
