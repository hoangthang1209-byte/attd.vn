import type { QuoteItemRow } from "@/components/admin/quotes/QuoteItemFormRow";
import type { QuickQuoteCommercialState, QuickQuotePartyState } from "./quick-quote-payload";

const STORAGE_KEY = "attd.quick-quote.draft.v1";

export type QuickQuoteDraft = {
  step: "customer" | "products" | "preview";
  party: QuickQuotePartyState;
  commercial: QuickQuoteCommercialState;
  items: QuoteItemRow[];
  savedAt: string;
};

export function loadQuickQuoteDraft(): QuickQuoteDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuickQuoteDraft;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveQuickQuoteDraft(draft: QuickQuoteDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

export function clearQuickQuoteDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
