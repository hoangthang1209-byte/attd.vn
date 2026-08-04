/**
 * Sprint 16.1 — AI writing UI preferences.
 *
 * Pure UI memory only (tone/length defaults, panel expand/collapse state)
 * following the exact same pattern as `@/features/blog/editor-preferences`:
 * localStorage-backed, best-effort, and must degrade to defaults silently
 * (SSR, private browsing, quota errors, corrupted values).
 */

import { readPref, writePref } from "@/features/blog/editor-preferences";

const PREFIX = "attd.editor.ai";

export type AiWritingTone = "professional" | "direct" | "consultative";
export type AiWritingLength = "short" | "medium" | "long";
export type AiWritingAudience = "b2b";

export type AiWritingPreferences = {
  tone: AiWritingTone;
  length: AiWritingLength;
  audience: AiWritingAudience;
  noFluff: boolean;
  language: string;
  statusBarExpanded: boolean;
  contextChipsExpanded: boolean;
};

export const AI_WRITING_PREF_KEYS = {
  tone: `${PREFIX}.tone`,
  length: `${PREFIX}.length`,
  audience: `${PREFIX}.audience`,
  noFluff: `${PREFIX}.noFluff`,
  language: `${PREFIX}.language`,
  statusBarExpanded: `${PREFIX}.statusBarExpanded`,
  contextChipsExpanded: `${PREFIX}.contextChipsExpanded`,
} as const;

export const DEFAULT_AI_WRITING_PREFERENCES: AiWritingPreferences = {
  tone: "professional",
  length: "medium",
  audience: "b2b",
  noFluff: true,
  language: "vi",
  statusBarExpanded: false,
  contextChipsExpanded: false,
};

const TONES: readonly AiWritingTone[] = ["professional", "direct", "consultative"];
const LENGTHS: readonly AiWritingLength[] = ["short", "medium", "long"];

function readBool(key: string, fallback: boolean): boolean {
  const raw = readPref(key);
  if (raw === "1") return true;
  if (raw === "0") return false;
  return fallback;
}

function writeBool(key: string, value: boolean): void {
  writePref(key, value ? "1" : "0");
}

/** Always returns a fully-populated preferences object — never partial/undefined. */
export function readAiWritingPreferences(): AiWritingPreferences {
  const toneRaw = readPref(AI_WRITING_PREF_KEYS.tone);
  const lengthRaw = readPref(AI_WRITING_PREF_KEYS.length);
  const languageRaw = readPref(AI_WRITING_PREF_KEYS.language);

  return {
    tone: TONES.includes(toneRaw as AiWritingTone) ? (toneRaw as AiWritingTone) : DEFAULT_AI_WRITING_PREFERENCES.tone,
    length: LENGTHS.includes(lengthRaw as AiWritingLength)
      ? (lengthRaw as AiWritingLength)
      : DEFAULT_AI_WRITING_PREFERENCES.length,
    audience: "b2b",
    noFluff: readBool(AI_WRITING_PREF_KEYS.noFluff, DEFAULT_AI_WRITING_PREFERENCES.noFluff),
    language: languageRaw && languageRaw.trim() ? languageRaw : DEFAULT_AI_WRITING_PREFERENCES.language,
    statusBarExpanded: readBool(AI_WRITING_PREF_KEYS.statusBarExpanded, DEFAULT_AI_WRITING_PREFERENCES.statusBarExpanded),
    contextChipsExpanded: readBool(
      AI_WRITING_PREF_KEYS.contextChipsExpanded,
      DEFAULT_AI_WRITING_PREFERENCES.contextChipsExpanded,
    ),
  };
}

/** Merges `partial` on top of the current stored preferences and persists it (best-effort). */
export function writeAiWritingPreferences(partial: Partial<AiWritingPreferences>): AiWritingPreferences {
  const next: AiWritingPreferences = { ...readAiWritingPreferences(), ...partial };

  if (partial.tone !== undefined) writePref(AI_WRITING_PREF_KEYS.tone, next.tone);
  if (partial.length !== undefined) writePref(AI_WRITING_PREF_KEYS.length, next.length);
  if (partial.noFluff !== undefined) writeBool(AI_WRITING_PREF_KEYS.noFluff, next.noFluff);
  if (partial.language !== undefined) writePref(AI_WRITING_PREF_KEYS.language, next.language);
  if (partial.statusBarExpanded !== undefined) writeBool(AI_WRITING_PREF_KEYS.statusBarExpanded, next.statusBarExpanded);
  if (partial.contextChipsExpanded !== undefined) {
    writeBool(AI_WRITING_PREF_KEYS.contextChipsExpanded, next.contextChipsExpanded);
  }

  return next;
}
