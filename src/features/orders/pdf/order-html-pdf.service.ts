import "server-only";

import puppeteer, { type Browser, type PDFOptions } from "puppeteer-core";
import { resolveChromiumExecutablePath } from "@/features/quotes/pdf/quote-chromium.server";
import {
  buildOrderDocumentUrl,
  resolveOrderDocumentBaseUrl,
} from "@/features/orders/pdf/order-pdf-url";
import {
  createOrderPdfTraceId,
  OrderPdfChromiumError,
} from "@/features/orders/pdf/order-pdf-chromium-error";
import type { OrderDocumentType } from "@/features/orders/order-document-types";

export { resolveOrderDocumentBaseUrl, buildOrderDocumentUrl };

type HtmlPdfOptions = {
  orderNo: string;
  docType: OrderDocumentType;
  pdfToken: string;
  requestHeaders?: Headers;
};

const PDF_VIEWPORT = {
  width: 1440,
  height: 1020,
  deviceScaleFactor: 1,
} as const;

const PDF_OPTIONS: PDFOptions = {
  format: "A4",
  landscape: true,
  printBackground: true,
  preferCSSPageSize: false,
  scale: 1,
  margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
};

const MIN_PDF_BYTES = 10_000;
const DOCUMENT_FETCH_USER_AGENT = "ATTD Order PDF Renderer";

function logStage(traceId: string, stage: string, extra?: Record<string, unknown>) {
  console.log("[order-pdf]", { traceId, stage, ...extra });
}

function isValidPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= MIN_PDF_BYTES && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

function wrapError(traceId: string, error: unknown): OrderPdfChromiumError {
  if (error instanceof OrderPdfChromiumError) return error;
  const message = error instanceof Error ? error.message : "Chromium PDF generation failed";
  return new OrderPdfChromiumError(traceId, message, { cause: error });
}

async function closeBrowserSafely(traceId: string, browser: Browser | null) {
  if (!browser) return;
  try {
    await browser.close();
  } catch (closeError) {
    console.error("[order-pdf] browser close failed", { traceId, closeError });
  }
}

export async function generateOrderHtmlPdf(
  documentUrl: string,
  meta?: { orderNo?: string },
): Promise<Buffer> {
  const traceId = createOrderPdfTraceId();
  const orderNo = meta?.orderNo ?? "unknown";
  let browser: Browser | null = null;

  logStage(traceId, "start", { documentUrl, orderNo });

  try {
    const executablePath = await resolveChromiumExecutablePath(traceId);
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      executablePath,
      headless: true,
      defaultViewport: PDF_VIEWPORT,
    });

    const page = await browser.newPage();
    const response = await page.goto(documentUrl, {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });

    const pageStatus = response?.status() ?? 0;
    if (!response || pageStatus >= 400) {
      throw new OrderPdfChromiumError(
        traceId,
        `Document page returned HTTP ${pageStatus || "unknown"}`,
      );
    }

    await page.waitForSelector(".order-document-root", { timeout: 30_000 });
    await page.waitForSelector('[data-order-pdf-ready="true"]', { timeout: 30_000 });
    await Promise.race([
      page.evaluate(async () => {
        if (document.fonts?.ready) await document.fonts.ready;
      }),
      new Promise((resolve) => setTimeout(resolve, 10_000)),
    ]);

    await page.emulateMediaType("screen");
    const pdf = await page.pdf(PDF_OPTIONS);
    const buffer = Buffer.from(pdf);

    if (!isValidPdfBuffer(buffer)) {
      throw new OrderPdfChromiumError(traceId, "Chromium returned an invalid PDF buffer.");
    }

    logStage(traceId, "complete", { orderNo, bytes: buffer.length });
    return buffer;
  } catch (error) {
    console.error("[order-pdf] chromium failed", {
      traceId,
      orderNo,
      documentUrl,
      error,
    });
    throw wrapError(traceId, error);
  } finally {
    await closeBrowserSafely(traceId, browser);
  }
}

export async function generateOrderHtmlPdfForDocument(
  options: HtmlPdfOptions,
): Promise<Buffer> {
  const baseUrl = resolveOrderDocumentBaseUrl(options.requestHeaders);
  const documentUrl = buildOrderDocumentUrl(options.orderNo, options.docType, {
    mode: "pdf",
    baseUrl,
    pdfToken: options.pdfToken,
  });

  const probe = await fetch(documentUrl, {
    headers: { "User-Agent": DOCUMENT_FETCH_USER_AGENT },
    cache: "no-store",
    redirect: "follow",
  });
  if (!probe.ok) {
    throw new OrderPdfChromiumError(
      createOrderPdfTraceId(),
      `Document URL fetch returned HTTP ${probe.status}`,
    );
  }

  return generateOrderHtmlPdf(documentUrl, { orderNo: options.orderNo });
}
