/**
 * Sprint 19.0 — Solo Founder Experience workspace preferences.
 *
 * Pure UI memory only: which IA density the operator prefers (Solo vs Team)
 * and whether technical/AI-internals panels should be visible (Developer
 * Mode). Reuses the same pref primitives as the blog editor so storage
 * failures (private mode, quota) degrade silently to the defaults — never
 * throws, never blocks rendering, never touches governed content or AI
 * workflow state.
 */
import { readBoolPref, readPref, writeBoolPref, writePref } from "@/features/blog/editor-preferences";

export type WorkspaceMode = "solo" | "team";

export const WORKSPACE_MODE_PREF_KEYS = {
  workspaceMode: "attd.editor.workspaceMode",
  developerMode: "attd.editor.developerMode",
} as const;

export const DEFAULT_WORKSPACE_MODE: WorkspaceMode = "solo";
export const DEFAULT_DEVELOPER_MODE = false;

/** Solo by default — the platform assumes a single founder/operator until told otherwise. */
export function readWorkspaceMode(): WorkspaceMode {
  const raw = readPref(WORKSPACE_MODE_PREF_KEYS.workspaceMode);
  return raw === "team" ? "team" : DEFAULT_WORKSPACE_MODE;
}

export function writeWorkspaceMode(mode: WorkspaceMode): void {
  writePref(WORKSPACE_MODE_PREF_KEYS.workspaceMode, mode === "team" ? "team" : "solo");
}

/** Off by default — technical AI/provider internals stay hidden until explicitly opted in. */
export function readDeveloperMode(): boolean {
  return readBoolPref(WORKSPACE_MODE_PREF_KEYS.developerMode) === true;
}

export function writeDeveloperMode(value: boolean): void {
  writeBoolPref(WORKSPACE_MODE_PREF_KEYS.developerMode, value);
}

export function isSoloMode(): boolean {
  return readWorkspaceMode() === "solo";
}

export function isDeveloperMode(): boolean {
  return readDeveloperMode();
}
