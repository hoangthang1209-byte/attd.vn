import { resolveOrderDocumentBaseUrl } from "@/features/orders/pdf/order-pdf-url";

export function buildProductionSheetDocumentUrl(
  orderId: string,
  options?: {
    mode?: "pdf" | "print" | "screen";
    baseUrl?: string;
    pdfToken?: string | null;
  },
): string {
  const base = options?.baseUrl?.replace(/\/$/, "") ?? resolveOrderDocumentBaseUrl();
  const mode = options?.mode ?? "screen";
  const params = new URLSearchParams({ mode });
  if (options?.pdfToken) {
    params.set("pdfToken", options.pdfToken);
  }
  return `${base}/admin/orders/${encodeURIComponent(orderId)}/production-sheet/document?${params.toString()}`;
}

export { resolveOrderDocumentBaseUrl };
