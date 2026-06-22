import "server-only";

import puppeteer, { type Browser, type PDFOptions } from "puppeteer-core";
import { resolveChromiumExecutablePath } from "@/features/quotes/pdf/quote-chromium.server";
import { resolveOrderDocumentBaseUrl } from "@/features/orders/pdf/order-pdf-url";
import {
  createOrderPdfTraceId,
  OrderPdfChromiumError,
} from "@/features/orders/pdf/order-pdf-chromium-error";
import { createDeliveryNotePdfToken } from "@/features/orders/delivery-note/delivery-note-pdf-token";

type HtmlPdfOptions = {
  orderId: string;
  executionId: string;
  requestHeaders?: Headers;
};

const PDF_VIEWPORT = {
  width: 1200,
  height: 900,
  deviceScaleFactor: 1,
} as const;

const PDF_OPTIONS: PDFOptions = {
  format: "A4",
  printBackground: true,
  preferCSSPageSize: false,
  margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
};

const MIN_PDF_BYTES = 5_000;

function buildDeliveryNoteDocumentUrl(
  orderId: string,
  executionId: string,
  options?: { baseUrl?: string; pdfToken?: string | null },
): string {
  const base = options?.baseUrl?.replace(/\/$/, "") ?? resolveOrderDocumentBaseUrl();
  const params = new URLSearchParams({ mode: "pdf", executionId });
  if (options?.pdfToken) params.set("pdfToken", options.pdfToken);
  return `${base}/admin/orders/${encodeURIComponent(orderId)}/delivery-note/document?${params.toString()}`;
}

export async function generateDeliveryNotePdf(options: HtmlPdfOptions): Promise<Buffer> {
  const traceId = createOrderPdfTraceId();
  const pdfToken = createDeliveryNotePdfToken(options.orderId, options.executionId);
  if (!pdfToken) {
    throw new OrderPdfChromiumError(traceId, "Không thể tạo token PDF phiếu giao hàng.");
  }

  const baseUrl = resolveOrderDocumentBaseUrl(options.requestHeaders);
  const documentUrl = buildDeliveryNoteDocumentUrl(options.orderId, options.executionId, {
    baseUrl,
    pdfToken,
  });

  let browser: Browser | null = null;
  try {
    const executablePath = await resolveChromiumExecutablePath(traceId);
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      executablePath,
      headless: true,
      defaultViewport: PDF_VIEWPORT,
    });
    const page = await browser.newPage();
    const response = await page.goto(documentUrl, { waitUntil: "networkidle0", timeout: 60_000 });
    if (!response || response.status() >= 400) {
      throw new OrderPdfChromiumError(traceId, `Document page HTTP ${response?.status() ?? "unknown"}`);
    }
    await page.waitForSelector(".delivery-note-doc", { timeout: 30_000 });
    const pdf = await page.pdf(PDF_OPTIONS);
    const buffer = Buffer.from(pdf);
    if (buffer.length < MIN_PDF_BYTES || buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new OrderPdfChromiumError(traceId, "Chromium returned an invalid PDF buffer.");
    }
    return buffer;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
  }
}
