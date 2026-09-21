/** Client-safe commit SHA formatting (no server/env imports). */
export function formatShortCommitSha(sha: string | null | undefined): string | null {
  if (!sha?.trim()) return null;
  return sha.trim().slice(0, 7);
}
