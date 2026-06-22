import "server-only";

import type { Browser } from "puppeteer-core";
import { createQuotePdfTraceId, QuotePdfChromiumError } from "@/features/quotes/pdf/quote-pdf-chromium-error";
import {
  closeChromiumBrowserSafely,
  isValidQuotePdfBuffer,
  launchChromiumBrowser,
  logChromiumBrowserDiagnostics,
  logChromiumStage,
  QUOTE_PDF_OPTIONS,
  QUOTE_PDF_VIEWPORT,
  resolveChromiumExecutablePath,
  wrapChromiumPdfError,
} from "@/features/quotes/pdf/quote-chromium.server";

function logChromiumFailure(
  traceId: string,
  quoteNo: string,
  documentUrl: string,
  error: unknown,
): void {
  console.error("[quote-pdf] chromium failed", {
    traceId,
    quoteNo,
    documentUrl,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : undefined,
  });
}

/** Minimal Chromium PDF smoke test — no quote data required. */
export async function runChromiumPdfHealthCheck(): Promise<{
  ok: true;
  traceId: string;
  executablePath: string;
  bytes: number;
}> {
  const traceId = createQuotePdfTraceId();
  let browser: Browser | null = null;

  try {
    const executablePath = await resolveChromiumExecutablePath(traceId);
    logChromiumBrowserDiagnostics(traceId, executablePath);
    browser = await launchChromiumBrowser(traceId, executablePath);

    const page = await browser.newPage();
    logChromiumStage(traceId, "page-created");
    await page.setViewport(QUOTE_PDF_VIEWPORT);
    logChromiumStage(traceId, "viewport-set");

    await page.setContent(
      `<!DOCTYPE html><html><body style="font-family:Arial;padding:24px">
        <h1 style="color:#e11d2e">ATTD Chromium PDF Health</h1>
        <p>Renderer smoke test.</p>
      </body></html>`,
      { waitUntil: "load" },
    );

    await page.emulateMediaType("screen");
    logChromiumStage(traceId, "generate-pdf:start");
    const pdf = await page.pdf(QUOTE_PDF_OPTIONS);
    const buffer = Buffer.from(pdf);
    logChromiumStage(traceId, "generate-pdf:success", { bytes: buffer.length });

    logChromiumStage(traceId, "validate-pdf:start");
    if (!isValidQuotePdfBuffer(buffer)) {
      throw new QuotePdfChromiumError(
        traceId,
        "Chromium returned an invalid PDF buffer.",
      );
    }
    logChromiumStage(traceId, "validate-pdf:success", { bytes: buffer.length });

    return { ok: true, traceId, executablePath, bytes: buffer.length };
  } catch (error) {
    logChromiumFailure(traceId, "health-check", "(inline-html)", error);
    throw wrapChromiumPdfError(traceId, error);
  } finally {
    await closeChromiumBrowserSafely(traceId, browser);
  }
}
