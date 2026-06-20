import { existsSync } from "fs";
import { readFileSync } from "fs";
import { join } from "path";
import puppeteer, { type Browser, type PDFOptions } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import {
  buildQuoteDocumentUrl,
  resolveQuoteDocumentBaseUrl,
} from "@/features/quotes/pdf/quote-pdf-url";
import {
  createQuotePdfTraceId,
  QuotePdfChromiumError,
} from "@/features/quotes/pdf/quote-pdf-chromium-error";

export { buildQuoteDocumentUrl, resolveQuoteDocumentBaseUrl };
export { QuotePdfChromiumError, createQuotePdfTraceId };

type HtmlPdfOptions = {
  publicToken: string;
  quoteNo?: string;
  itemCount?: number;
  imageCount?: number;
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
  margin: {
    top: "8mm",
    right: "8mm",
    bottom: "8mm",
    left: "8mm",
  },
};

const MIN_PDF_BYTES = 10_000;
const DOCUMENT_FETCH_USER_AGENT = "ATTD Quote PDF Renderer";

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

function getChromiumPackageVersion(): string | null {
  try {
    const pkgPath = join(process.cwd(), "node_modules/@sparticuz/chromium/package.json");
    const raw = readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

function getPuppeteerCoreVersion(): string | null {
  try {
    const pkgPath = join(process.cwd(), "node_modules/puppeteer-core/package.json");
    const raw = readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

function logStage(
  traceId: string,
  stage: string,
  extra?: Record<string, unknown>,
): void {
  console.log("[quote-pdf]", { traceId, stage, ...extra });
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

function wrapError(traceId: string, error: unknown): QuotePdfChromiumError {
  if (error instanceof QuotePdfChromiumError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : "Chromium PDF generation failed";
  return new QuotePdfChromiumError(traceId, message, { cause: error });
}

function isValidPdfBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= MIN_PDF_BYTES &&
    buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  );
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

/** Resolve Chrome/Chromium executable — Vercel uses @sparticuz/chromium only. */
export async function resolveChromiumExecutablePath(
  traceId: string,
): Promise<string> {
  logStage(traceId, "resolve-executable-path:start");

  if (isVercelRuntime()) {
    const executablePath = await chromium.executablePath();
    if (!executablePath || !existsSync(executablePath)) {
      throw new QuotePdfChromiumError(
        traceId,
        `Không tìm thấy Chrome/Chromium để tạo PDF. (Vercel path missing: ${executablePath || "empty"})`,
      );
    }
    logStage(traceId, "resolve-executable-path:success", { executablePath });
    return executablePath;
  }

  const envPath =
    process.env.CHROME_EXECUTABLE_PATH?.trim() ||
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (envPath && existsSync(envPath)) {
    logStage(traceId, "resolve-executable-path:success", {
      executablePath: envPath,
      source: "env",
    });
    return envPath;
  }

  const macChrome =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(macChrome)) {
    logStage(traceId, "resolve-executable-path:success", {
      executablePath: macChrome,
      source: "macos-chrome",
    });
    return macChrome;
  }

  const linuxCandidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const candidate of linuxCandidates) {
    if (existsSync(candidate)) {
      logStage(traceId, "resolve-executable-path:success", {
        executablePath: candidate,
        source: "linux-path",
      });
      return candidate;
    }
  }

  try {
    const sparticuzPath = await chromium.executablePath();
    if (sparticuzPath && existsSync(sparticuzPath)) {
      logStage(traceId, "resolve-executable-path:success", {
        executablePath: sparticuzPath,
        source: "sparticuz-local",
      });
      return sparticuzPath;
    }
  } catch {
    // fall through
  }

  throw new QuotePdfChromiumError(
    traceId,
    "Không tìm thấy Chrome/Chromium để tạo PDF.",
  );
}

function getLaunchArgs(executablePath: string): string[] {
  if (isVercelRuntime()) {
    return [
      ...chromium.args,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ];
  }

  return [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
  ];
}

async function launchChromiumBrowser(
  traceId: string,
  executablePath: string,
): Promise<Browser> {
  logStage(traceId, "launch-browser:start", { executablePath });

  const browser = await puppeteer.launch({
    args: getLaunchArgs(executablePath),
    executablePath,
    headless: true,
    defaultViewport: PDF_VIEWPORT,
  });

  logStage(traceId, "launch-browser:success");
  return browser;
}

function logBrowserDiagnostics(
  traceId: string,
  executablePath: string,
): void {
  console.log("[quote-pdf] chromium diagnostics", {
    traceId,
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    cwd: process.cwd(),
    isVercel: isVercelRuntime(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    nodeEnv: process.env.NODE_ENV,
    executablePath,
    executableExists: executablePath ? existsSync(executablePath) : false,
    chromiumPackageVersion: getChromiumPackageVersion(),
    puppeteerCoreVersion: getPuppeteerCoreVersion(),
  });
}

async function verifyDocumentUrlReachable(
  traceId: string,
  documentUrl: string,
): Promise<void> {
  logStage(traceId, "document-request:start", { documentUrl });

  const documentResponse = await fetch(documentUrl, {
    headers: { "User-Agent": DOCUMENT_FETCH_USER_AGENT },
    cache: "no-store",
    redirect: "follow",
  });

  const contentType = documentResponse.headers.get("content-type");
  logStage(traceId, "document-status", {
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

  logStage(traceId, "document-request:success", {
    status: documentResponse.status,
    finalUrl: documentResponse.url,
  });
}

async function waitForDocumentRoot(
  traceId: string,
  page: import("puppeteer-core").Page,
): Promise<void> {
  logStage(traceId, "wait-document-root:start");
  try {
    await page.waitForSelector(".quote-document-root", { timeout: 30000 });
    logStage(traceId, "wait-document-root:success");
  } catch (error) {
    const htmlSnippet = await page.content();
    console.error("[quote-pdf] root selector missing", {
      traceId,
      htmlPreview: htmlSnippet.slice(0, 2000),
    });
    throw wrapError(traceId, error);
  }
}

async function waitForPdfReadySignal(
  traceId: string,
  page: import("puppeteer-core").Page,
): Promise<void> {
  logStage(traceId, "wait-pdf-ready:start");
  try {
    await page.waitForSelector('[data-quote-pdf-ready="true"]', {
      timeout: 30000,
    });
    logStage(traceId, "wait-pdf-ready:success");
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
    throw wrapError(traceId, error);
  }
}

async function waitForFonts(
  traceId: string,
  page: import("puppeteer-core").Page,
): Promise<void> {
  logStage(traceId, "wait-fonts:start");
  await Promise.race([
    page.evaluate(async () => {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        await document.fonts.ready;
      }
    }),
    new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
  ]);
  logStage(traceId, "wait-fonts:success");
}

async function waitForImages(
  traceId: string,
  page: import("puppeteer-core").Page,
): Promise<void> {
  logStage(traceId, "wait-images:start");

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

  logStage(traceId, "wait-images:success", {
    imageCount: result.imageCount,
    failedCount: result.failedUrls.length,
  });
}

async function closeBrowserSafely(
  traceId: string,
  browser: Browser | null,
): Promise<void> {
  if (!browser) return;
  logStage(traceId, "close-browser:start");
  try {
    await browser.close();
    logStage(traceId, "close-browser:success");
  } catch (closeError) {
    console.error("[quote-pdf] browser close failed", {
      traceId,
      errorName: closeError instanceof Error ? closeError.name : "UnknownError",
      errorMessage:
        closeError instanceof Error ? closeError.message : String(closeError),
    });
  }
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
    logBrowserDiagnostics(traceId, executablePath);
    browser = await launchChromiumBrowser(traceId, executablePath);

    const page = await browser.newPage();
    logStage(traceId, "page-created");
    await page.setViewport(PDF_VIEWPORT);
    logStage(traceId, "viewport-set");

    await page.setContent(
      `<!DOCTYPE html><html><body style="font-family:Arial;padding:24px">
        <h1 style="color:#e11d2e">ATTD Chromium PDF Health</h1>
        <p>Renderer smoke test.</p>
      </body></html>`,
      { waitUntil: "load" },
    );

    await page.emulateMediaType("screen");
    logStage(traceId, "generate-pdf:start");
    const pdf = await page.pdf(PDF_OPTIONS);
    const buffer = Buffer.from(pdf);
    logStage(traceId, "generate-pdf:success", { bytes: buffer.length });

    logStage(traceId, "validate-pdf:start");
    if (!isValidPdfBuffer(buffer)) {
      throw new QuotePdfChromiumError(
        traceId,
        "Chromium returned an invalid PDF buffer.",
      );
    }
    logStage(traceId, "validate-pdf:success", { bytes: buffer.length });

    return { ok: true, traceId, executablePath, bytes: buffer.length };
  } catch (error) {
    logChromiumFailure(traceId, "health-check", "(inline-html)", error);
    throw wrapError(traceId, error);
  } finally {
    await closeBrowserSafely(traceId, browser);
  }
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
  let executablePath = "";

  try {
    executablePath = await resolveChromiumExecutablePath(traceId);
    logBrowserDiagnostics(traceId, executablePath);

    await verifyDocumentUrlReachable(traceId, documentUrl);

    browser = await launchChromiumBrowser(traceId, executablePath);
    const page = await browser.newPage();
    logStage(traceId, "page-created");

    await page.setViewport(PDF_VIEWPORT);
    logStage(traceId, "viewport-set");

    const response = await page.goto(documentUrl, {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });

    logStage(traceId, "document-request:success", {
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
      logStage(traceId, "dev-screenshot", { screenshotPath });
    }

    await page.emulateMediaType("screen");
    logStage(traceId, "generate-pdf:start");
    const pdf = await page.pdf(PDF_OPTIONS);
    const buffer = Buffer.from(pdf);
    logStage(traceId, "generate-pdf:success", { bytes: buffer.length });

    logStage(traceId, "validate-pdf:start");
    if (!isValidPdfBuffer(buffer)) {
      throw new QuotePdfChromiumError(
        traceId,
        "Chromium returned an invalid PDF buffer.",
      );
    }
    logStage(traceId, "validate-pdf:success", { bytes: buffer.length });

    console.log("[quote-pdf]", {
      traceId,
      stage: "complete",
      quoteNo,
      bytes: buffer.length,
    });

    return buffer;
  } catch (error) {
    logChromiumFailure(traceId, quoteNo, documentUrl, error);
    throw wrapError(traceId, error);
  } finally {
    await closeBrowserSafely(traceId, browser);
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
