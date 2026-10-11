/**
 * Media OS — advanced lifecycle/intelligence surfaces stay available by URL
 * but hidden from default staff navigation unless explicitly enabled.
 */
export function mediaAdvancedToolsEnabled(
  searchParams: URLSearchParams | { get(name: string): string | null } | null | undefined,
): boolean {
  const raw = searchParams?.get("advanced") ?? searchParams?.get("mediaAdvanced");
  return raw === "1" || raw === "true";
}
