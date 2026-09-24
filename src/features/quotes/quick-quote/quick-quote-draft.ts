import {
  normalizeQuickQuoteDraft,
  QUICK_QUOTE_DRAFT_STORAGE_KEY,
  type QuickQuoteDraft,
} from "@/features/quotes/quick-quote/quick-quote.types";

export function loadQuickQuoteDraft(): QuickQuoteDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(QUICK_QUOTE_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return normalizeQuickQuoteDraft(JSON.parse(raw) as Partial<QuickQuoteDraft>);
  } catch {
    return null;
  }
}

export function saveQuickQuoteDraft(draft: QuickQuoteDraft): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeQuickQuoteDraft({
    ...draft,
    updatedAt: new Date().toISOString(),
  });
  window.localStorage.setItem(QUICK_QUOTE_DRAFT_STORAGE_KEY, JSON.stringify(normalized));
}

export function clearQuickQuoteDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(QUICK_QUOTE_DRAFT_STORAGE_KEY);
}

export function trackRecentProductIds(
  current: string[],
  productId: string,
): string[] {
  if (!productId) return current;
  const next = [productId, ...current.filter((id) => id !== productId)];
  return next.slice(0, 12);
}
