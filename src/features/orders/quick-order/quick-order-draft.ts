import { DEFAULT_QUICK_ORDER_SIZE_COLUMNS } from "@/features/orders/quick-order/quick-order-sizes";
import {
  normalizeQuickOrderDraft,
  QUICK_ORDER_DRAFT_STORAGE_KEY,
  QUICK_ORDER_DRAFT_STORAGE_KEY_V1,
  type QuickOrderDraft,
} from "@/features/orders/quick-order/quick-order.types";

export function loadQuickOrderDraft(): QuickOrderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const rawV2 = window.localStorage.getItem(QUICK_ORDER_DRAFT_STORAGE_KEY);
    if (rawV2) {
      return normalizeQuickOrderDraft(JSON.parse(rawV2) as Partial<QuickOrderDraft>);
    }
    const rawV1 = window.localStorage.getItem(QUICK_ORDER_DRAFT_STORAGE_KEY_V1);
    if (rawV1) {
      const parsed = JSON.parse(rawV1) as Partial<QuickOrderDraft>;
      return normalizeQuickOrderDraft({
        ...parsed,
        sizeColumns: DEFAULT_QUICK_ORDER_SIZE_COLUMNS,
      });
    }
    return null;
  } catch {
    return null;
  }
}

export function saveQuickOrderDraft(draft: QuickOrderDraft): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeQuickOrderDraft(draft);
  window.localStorage.setItem(QUICK_ORDER_DRAFT_STORAGE_KEY, JSON.stringify(normalized));
  window.localStorage.removeItem(QUICK_ORDER_DRAFT_STORAGE_KEY_V1);
}

export function clearQuickOrderDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(QUICK_ORDER_DRAFT_STORAGE_KEY);
  window.localStorage.removeItem(QUICK_ORDER_DRAFT_STORAGE_KEY_V1);
}
