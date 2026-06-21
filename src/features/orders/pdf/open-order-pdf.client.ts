"use client";

export function openOrderDocumentView(orderNo: string, docType: string): void {
  const url = `/o/${encodeURIComponent(orderNo)}/${docType}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openOrderPdfInline(orderId: string, docType: string): void {
  const url = `/api/orders/${encodeURIComponent(orderId)}/documents/${docType}/pdf?disposition=inline`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function orderPdfDownloadUrl(orderId: string, docType: string): string {
  return `/api/orders/${encodeURIComponent(orderId)}/documents/${docType}/pdf?disposition=attachment`;
}
