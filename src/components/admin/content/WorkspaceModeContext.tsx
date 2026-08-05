"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_DEVELOPER_MODE,
  DEFAULT_WORKSPACE_MODE,
  readDeveloperMode,
  readWorkspaceMode,
  writeDeveloperMode,
  writeWorkspaceMode,
  type WorkspaceMode,
} from "@/features/content/editorial/workspace-mode-preferences";

type WorkspaceModeContextValue = {
  mode: WorkspaceMode;
  isSolo: boolean;
  developerMode: boolean;
  setMode: (mode: WorkspaceMode) => void;
  setDeveloperMode: (value: boolean) => void;
  toggleMode: () => void;
  toggleDeveloperMode: () => void;
};

const WorkspaceModeContext = createContext<WorkspaceModeContextValue | null>(null);

/**
 * Mounted once in `AdminShell` so any admin child can read/toggle the
 * Solo/Team + Developer Mode UI preferences without prop drilling. Never
 * reads/writes anything beyond localStorage (see workspace-mode-preferences).
 */
export function WorkspaceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<WorkspaceMode>(DEFAULT_WORKSPACE_MODE);
  const [developerMode, setDeveloperModeState] = useState<boolean>(DEFAULT_DEVELOPER_MODE);

  useEffect(() => {
    setModeState(readWorkspaceMode());
    setDeveloperModeState(readDeveloperMode());
  }, []);

  const setMode = useCallback((next: WorkspaceMode) => {
    setModeState(next);
    writeWorkspaceMode(next);
  }, []);

  const setDeveloperMode = useCallback((next: boolean) => {
    setDeveloperModeState(next);
    writeDeveloperMode(next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => {
      const next = current === "solo" ? "team" : "solo";
      writeWorkspaceMode(next);
      return next;
    });
  }, []);

  const toggleDeveloperMode = useCallback(() => {
    setDeveloperModeState((current) => {
      const next = !current;
      writeDeveloperMode(next);
      return next;
    });
  }, []);

  const value = useMemo<WorkspaceModeContextValue>(
    () => ({
      mode,
      isSolo: mode === "solo",
      developerMode,
      setMode,
      setDeveloperMode,
      toggleMode,
      toggleDeveloperMode,
    }),
    [mode, developerMode, setMode, setDeveloperMode, toggleMode, toggleDeveloperMode],
  );

  return <WorkspaceModeContext.Provider value={value}>{children}</WorkspaceModeContext.Provider>;
}

/**
 * Silently degrades to Solo/non-developer defaults when used outside the
 * provider (e.g. isolated stories/tests) instead of throwing.
 */
export function useWorkspaceMode(): WorkspaceModeContextValue {
  const ctx = useContext(WorkspaceModeContext);
  if (ctx) return ctx;
  return {
    mode: DEFAULT_WORKSPACE_MODE,
    isSolo: DEFAULT_WORKSPACE_MODE === "solo",
    developerMode: DEFAULT_DEVELOPER_MODE,
    setMode: () => {},
    setDeveloperMode: () => {},
    toggleMode: () => {},
    toggleDeveloperMode: () => {},
  };
}
