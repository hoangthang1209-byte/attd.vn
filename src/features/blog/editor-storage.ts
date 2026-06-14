export type BlogEditorMode = "visual" | "markdown";

const STORAGE_KEY = "attd-blog-editor-mode";

export function getStoredEditorMode(): BlogEditorMode {
  if (typeof window === "undefined") return "visual";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "markdown" ? "markdown" : "visual";
}

export function setStoredEditorMode(mode: BlogEditorMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
}
