"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EDITOR_PREF_KEYS,
  readBoolPref,
  writeBoolPref,
} from "@/features/blog/editor-preferences";

/**
 * Open/closed state that survives reloads. The first render always uses
 * `defaultOpen` so the server HTML and the client agree; the stored preference
 * is applied after mount.
 */
export function usePersistentDisclosure(
  storageKey: string | null,
  defaultOpen: boolean,
): [boolean, (next?: boolean) => void] {
  const [open, setOpen] = useState(defaultOpen);
  const defaultRef = useRef(defaultOpen);

  useEffect(() => {
    if (!storageKey) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const stored = readBoolPref(EDITOR_PREF_KEYS.section(storageKey));
      if (stored !== null && stored !== defaultRef.current) setOpen(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const toggle = useCallback(
    (next?: boolean) => {
      setOpen((current) => {
        const value = next ?? !current;
        if (storageKey) writeBoolPref(EDITOR_PREF_KEYS.section(storageKey), value);
        return value;
      });
    },
    [storageKey],
  );

  return [open, toggle];
}
