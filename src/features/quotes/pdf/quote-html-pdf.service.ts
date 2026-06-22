import "server-only";

import type { Browser } from "puppeteer-core";
import {
  buildQuoteDocumentUrl,
  resolveQuoteDocumentBaseUrl,
} from "@/features/quotes/pdf/quote-pdf-url";
import {
  createQuotePdfTraceId,
  QuotePdfChromiumError,
} from "@/features/quotes/pdf/quote-pdf-chromium-error";
import {
  closeChromiumBrowserSafely,
  isValidQuotePdfBuffer,
  launchChromiumBrowser,
  logChromiumBrowserDiagnostics,
  logChromiumStage,
  QUOTE_MIN_PDF_BYTES,
  QUOTE_PDF_OPTIONS,
  QUOTE_PDF_VIEWPORT,
  resolveChromiumExecutablePath,
  wrapChromiumPdfError,
} from "@/features/quotes/pdf/quote-chromium.server";

type HtmlPdfOptions = {
  publicToken: string;
  quoteNo?: string;
  itemCount?: number;
  imageCount?: number;
  requestHeaders?: Headers;
};

const DOCUMENT_FETCH_USER_AGENT = "ATTD Quote PDF Renderer";

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

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

function assertProductionDocumentUrl(documentUrl: string, traceId: string): void {
  const isProduction =
    process.env.NODE_ENV === "production" || isVercelRuntime();
  if (!isProduction) return;

  if (
    documentUrl.includes("localhost") ||
    documentUrl.includes("127.0.0.1") ||
    documentUrl.startsWith("http://")
  ) {
    throw new QuotePdfChromiumError(
      traceId,
      `Production quote PDF requires HTTPS document URL, got: ${documentUrl}`,
    );
  }
}

async function verifyDocumentUrlReachable(
  traceId: string,
  documentUrl: string,
): Promise<void> {
  logChromiumStage(traceId, "document-request:start", { documentUrl });

  const documentResponse = await fetch(documentUrl, {
    headers: { "User-Agent": DOCUMENT_FETCH_USER_AGENT },
    cache: "no-store",
    redirect: "follow",
  });

  const contentType = documentResponse.headers.get("content-type");
  logChromiumStage(traceId, "document-status", {
    status: documentResponse.status,
    contentType,
    finalUrl: documentResponse.url,
  });

  if (!documentResponse.ok) {
    throw new QuotePdfChromiumError(
      traceId,
      `Document URL fetch returned HTTP ${documentResponse.status}: ${documentResponse.url}`,
    );
  }

  logChromiumStage(traceId, "document-request:success", {
    status: documentResponse.status,
    finalUrl: documentResponse.url,
  });
}

async function waitForDocumentRoot(
  traceId: string,
  page: import("puppeteer-core").Page,
): Promise<void> {
  logChromiumStage(traceId, "wait-document-root:start");
  try {
    await page.waitForSelector(".quote-document-root", { timeout: 30000 });
    logChromiumStage(traceId, "wait-document-root:success");
  } catch (error) {
    const htmlSnippet = await page.content();
    console.error("[quote-pdf] root selector missing", {
      traceId,
      htmlPreview: htmlSnippet.slice(0, 2000),
    });
    throw wrapChromiumPdfError(traceId, error);
  }
}

async function waitForPdfReadySignal(
  traceId: string,
  page: import("puppeteer-core").Page,
): Promise<void> {
  logChromiumStage(traceId, "wait-pdf-ready:start");
  try {
    await page.waitForSelector('[data-quote-pdf-ready="true"]', {
      timeout: 30000,
    });
    logChromiumStage(traceId, "wait-pdf-ready:success");
  } catch (error) {
    const readyState = await page.evaluate(() => ({
      readyState: document.readyState,
      rootExists: Boolean(document.querySelector(".quote-document-root")),
      pdfReady:
        document.documentElement.getAttribute("data-quote-pdf-ready") ?? null,
      imageCount: document.images.length,
      incompleteImages: Array.from(document.images).filter(
        (image) => !image.complete,
      ).length,
    }));
    console.error("[quote-pdf] pdf readiness timeout", { traceId, readyState });
    throw wrapChromiumPdfError(traceId, error);
  }
}

async function waitForFonts(
  traceId: string,
  page: import("puppeteer-core").Page,
): Promise<void> {
  logChromiumStage(traceId, "wait-fonts:start");
  await Promise.race([
    page.evaluate(async () => {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        await document.fonts.ready;
      }
    }),
    new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
  ]);
  logChromiumStage(traceId, "wait-fonts:success");
}

async function waitForImages(
  traceId: string,
  page: import("puppeteer-core").Page,
): Promise<void> {
  logChromiumStage(traceId, "wait-images:start");

  const result = await Promise.race([
    page.evaluate(async () => {
      const images = Array.from(document.images);
      const failedUrls: string[] = [];
      await Promise.all(
        images.map(
          (image) =>
            new Promise<void>((resolve) => {
              if (image.complete) {
                if (image.naturalWidth === 0 && image.src) {
                  failedUrls.push(image.src);
                }
                resolve();
                return;
              }
              image.addEventListener(
                "load",
                () => resolve(),
                { once: true },
              );
              image.addEventListener(
                "error",
                () => {
                  if (image.src) failedUrls.push(image.src);
                  resolve();
                },
                { once: true },
              );
            }),
        ),
      );
      return { imageCount: images.length, failedUrls };
    }),
    new Promise<{ imageCount: number; failedUrls: string[] }>((resolve) =>
      setTimeout(
        () => resolve({ imageCount: -1, failedUrls: ["[wait-images-timeout]"] }),
        15_000,
      ),
    ),
  ]);

  if (result.failedUrls.length > 0) {
    console.warn("[quote-pdf]", {
      traceId,
      stage: "wait-images:partial-failures",
      imageCount: result.imageCount,
      failedUrls: result.failedUrls.slice(0, 20),
    });
  }

  logChromiumStage(traceId, "wait-images:success", {
    imageCount: result.imageCount,
    failedCount: result.failedUrls.length,
  });
}

export async function generateQuoteHtmlPdf(
  documentUrl: string,
  meta?: Pick<HtmlPdfOptions, "quoteNo" | "itemCount" | "imageCount">,
): Promise<Buffer> {
  const traceId = createQuotePdfTraceId();
  const quoteNo = meta?.quoteNo ?? "unknown";

  console.log("[quote-pdf]", {
    traceId,
    stage: "start",
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL ?? null,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    documentUrl,
    quoteNo,
    itemCount: meta?.itemCount,
    imageCount: meta?.imageCount,
  });

  assertProductionDocumentUrl(documentUrl, traceId);

  let browser: Browser | null = null;

  try {
    const executablePath = await resolveChromiumExecutablePath(traceId);
    logChromiumBrowserDiagnostics(traceId, executablePath);

    await verifyDocumentUrlReachable(traceId, documentUrl);

    browser = await launchChromiumBrowser(traceId, executablePath);
    const page = await browser.newPage();
    logChromiumStage(traceId, "page-created");

    await page.setViewport(QUOTE_PDF_VIEWPORT);
    logChromiumStage(traceId, "viewport-set");

    const response = await page.goto(documentUrl, {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });

    logChromiumStage(traceId, "document-request:success", {
      pageStatus: response?.status() ?? null,
      pageUrl: response?.url() ?? null,
    });

    const pageStatus = response?.status() ?? 0;
    if (!response || pageStatus >= 400) {
      throw new QuotePdfChromiumError(
        traceId,
        `Document page.goto returned HTTP ${pageStatus || "unknown"}: ${response?.url() ?? documentUrl}`,
      );
    }

    await waitForDocumentRoot(traceId, page);
    await waitForPdfReadySignal(traceId, page);
    await waitForFonts(traceId, page);
    await waitForImages(traceId, page);

    if (process.env.NODE_ENV === "development") {
      const screenshotPath = `/tmp/quote-pdf-${traceId}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      logChromiumStage(traceId, "dev-screenshot", { screenshotPath });
    }

    await page.emulateMediaType("screen");
    logChromiumStage(traceId, "generate-pdf:start");
    const pdf = await page.pdf(QUOTE_PDF_OPTIONS);
    const buffer = Buffer.from(pdf);
    logChromiumStage(traceId, "generate-pdf:success", { bytes: buffer.length });

    logChromiumStage(traceId, "validate-pdf:start");
    if (!isValidQuotePdfBuffer(buffer, QUOTE_MIN_PDF_BYTES)) {
      throw new QuotePdfChromiumError(
        traceId,
        "Chromium returned an invalid PDF buffer.",
      );
    }
    logChromiumStage(traceId, "validate-pdf:success", { bytes: buffer.length });

    console.log("[quote-pdf]", {
      traceId,
      stage: "complete",
      quoteNo,
      bytes: buffer.length,
    });

    return buffer;
  } catch (error) {
    logChromiumFailure(traceId, quoteNo, documentUrl, error);
    throw wrapChromiumPdfError(traceId, error);
  } finally {
    await closeChromiumBrowserSafely(traceId, browser);
  }
}

export async function generateQuoteHtmlPdfByToken(
  options: HtmlPdfOptions,
): Promise<Buffer> {
  const baseUrl = resolveQuoteDocumentBaseUrl(options.requestHeaders);
  const documentUrl = buildQuoteDocumentUrl(options.publicToken, {
    mode: "pdf",
    baseUrl,
  });

  return generateQuoteHtmlPdf(documentUrl, {
    quoteNo: options.quoteNo,
    itemCount: options.itemCount,
    imageCount: options.imageCount,
  });
}
