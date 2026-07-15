import type {
  WritingSectionLock,
  WritingSectionLockReason,
} from "@/features/writing-engine/writing-engine.types";

export function parseSectionLocks(raw: unknown): WritingSectionLock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is WritingSectionLock => {
      const r = row as WritingSectionLock;
      return Boolean(r && typeof r.sectionId === "string");
    })
    .map((r) => ({
      sectionId: r.sectionId,
      locked: Boolean(r.locked),
      reason: r.reason,
      lockedBy: r.lockedBy ?? null,
      lockedAt: r.lockedAt,
      note: r.note ?? null,
    }));
}

export function getSectionLock(
  locks: WritingSectionLock[],
  sectionId: string
): WritingSectionLock | null {
  return locks.find((l) => l.sectionId === sectionId && l.locked) ?? null;
}

export function lockSection(
  locks: WritingSectionLock[],
  sectionId: string,
  reason: WritingSectionLockReason,
  lockedBy?: string | null,
  note?: string | null
): WritingSectionLock[] {
  const next = locks.filter((l) => l.sectionId !== sectionId);
  next.push({
    sectionId,
    locked: true,
    reason,
    lockedBy: lockedBy ?? null,
    lockedAt: new Date().toISOString(),
    note: note ?? null,
  });
  return next;
}

export function unlockSection(
  locks: WritingSectionLock[],
  sectionId: string
): WritingSectionLock[] {
  return locks.map((l) =>
    l.sectionId === sectionId ? { ...l, locked: false, note: "unlocked" } : l
  );
}

export function isSectionLocked(locks: WritingSectionLock[], sectionId: string): boolean {
  return Boolean(getSectionLock(locks, sectionId));
}
