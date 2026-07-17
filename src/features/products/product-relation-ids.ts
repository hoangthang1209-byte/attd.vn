/** Client-only keys from `createClientKey("opt"|"val"|…)`. Never treat as DB relation IDs. */
const CLIENT_RELATION_KEY_RE = /^(opt|val|var|spec|cap|attr|tmp)-[a-z0-9]+$/i;

/**
 * True for Prisma cuid / UUID style ids.
 * False for empty values and client temp keys (`opt-*`, `val-*`, `tmp-*`, …).
 */
export function isPersistedProductRelationId(id: string | undefined | null): boolean {
  if (!id?.trim()) return false;
  return !CLIENT_RELATION_KEY_RE.test(id.trim());
}
