import {
  QUICK_ORDER_DRAFT_STORAGE_KEY,
  type QuickOrderDraft,
} from "@/features/orders/quick-order/quick-order.types";

export function loadQuickOrderDraft(): QuickOrderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(QUICK_ORDER_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QuickOrderDraft;
  } catch {
    return null;
  }
}

export function saveQuickOrderDraft(draft: QuickOrderDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUICK_ORDER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearQuickOrderDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(QUICK_ORDER_DRAFT_STORAGE_KEY);
}
