"use client";

export function openProductionSheetView(orderId: string): void {
  const url = `/admin/orders/${encodeURIComponent(orderId)}/production-sheet/document`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openProductionSheetPdfInline(orderId: string): void {
  const url = `/api/orders/${encodeURIComponent(orderId)}/documents/production-sheet/pdf?disposition=inline`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function productionSheetPdfDownloadUrl(orderId: string): string {
  return `/api/orders/${encodeURIComponent(orderId)}/documents/production-sheet/pdf?disposition=attachment`;
}
