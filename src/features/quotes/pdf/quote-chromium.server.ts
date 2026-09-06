import "server-only";

import puppeteer, { type Browser, type PDFOptions } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { QuotePdfChromiumError } from "@/features/quotes/pdf/quote-pdf-chromium-error";

export const QUOTE_PDF_VIEWPORT = {
  width: 1440,
  height: 1020,
  deviceScaleFactor: 1,
} as const;

export const QUOTE_PDF_OPTIONS: PDFOptions = {
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

export const QUOTE_MIN_PDF_BYTES = 10_000;

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

export function logChromiumStage(
  traceId: string,
  stage: string,
  extra?: Record<string, unknown>,
): void {
  console.log("[quote-pdf]", { traceId, stage, ...extra });
}

export function isValidQuotePdfBuffer(buffer: Buffer, minBytes = QUOTE_MIN_PDF_BYTES): boolean {
  return (
    buffer.length >= minBytes &&
    buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  );
}

/** Resolve Chrome/Chromium executable — Vercel uses @sparticuz/chromium only. */
export async function resolveChromiumExecutablePath(
  traceId: string,
): Promise<string> {
  logChromiumStage(traceId, "resolve-executable-path:start");

  if (isVercelRuntime()) {
    const executablePath = await chromium.executablePath();
    if (!executablePath) {
      throw new QuotePdfChromiumError(
        traceId,
        "Không tìm thấy Chrome/Chromium để tạo PDF. (Vercel path missing)",
      );
    }
    logChromiumStage(traceId, "resolve-executable-path:success", { executablePath });
    return executablePath;
  }

  const envPath =
    process.env.CHROME_EXECUTABLE_PATH?.trim() ||
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (envPath) {
    logChromiumStage(traceId, "resolve-executable-path:success", {
      executablePath: envPath,
      source: "env",
    });
    return envPath;
  }

  if (process.platform === "darwin") {
    const macChrome =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    logChromiumStage(traceId, "resolve-executable-path:success", {
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
    logChromiumStage(traceId, "resolve-executable-path:success", {
      executablePath: candidate,
      source: "linux-path",
    });
    return candidate;
  }

  try {
    const sparticuzPath = await chromium.executablePath();
    if (sparticuzPath) {
      logChromiumStage(traceId, "resolve-executable-path:success", {
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

function getLaunchArgs(): string[] {
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

export async function launchChromiumBrowser(
  traceId: string,
  executablePath: string,
  viewport = QUOTE_PDF_VIEWPORT,
): Promise<Browser> {
  logChromiumStage(traceId, "launch-browser:start", { executablePath });

  // @sparticuz/chromium ships chrome-headless-shell which only supports headless:"shell".
  // Using headless:true (new headless) fails immediately on Vercel.
  if (isVercelRuntime()) {
    chromium.setGraphicsMode = false;
  }

  const headlessMode: boolean | "shell" = isVercelRuntime() ? "shell" : true;
  const args = isVercelRuntime()
    ? await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" })
    : getLaunchArgs();

  const browser = await puppeteer.launch({
    args,
    executablePath,
    headless: headlessMode,
    defaultViewport: viewport,
  });

  logChromiumStage(traceId, "launch-browser:success", {
    headless: headlessMode,
    argCount: args.length,
  });
  return browser;
}

export function logChromiumBrowserDiagnostics(
  traceId: string,
  executablePath: string,
): void {
  console.log("[quote-pdf] chromium diagnostics", {
    traceId,
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    isVercel: isVercelRuntime(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    nodeEnv: process.env.NODE_ENV,
    executablePath,
  });
}

export async function closeChromiumBrowserSafely(
  traceId: string,
  browser: Browser | null,
): Promise<void> {
  if (!browser) return;
  logChromiumStage(traceId, "close-browser:start");
  try {
    await browser.close();
    logChromiumStage(traceId, "close-browser:success");
  } catch (closeError) {
    console.error("[quote-pdf] browser close failed", {
      traceId,
      errorName: closeError instanceof Error ? closeError.name : "UnknownError",
      errorMessage:
        closeError instanceof Error ? closeError.message : String(closeError),
    });
  }
}

export function wrapChromiumPdfError(
  traceId: string,
  error: unknown,
): QuotePdfChromiumError {
  if (error instanceof QuotePdfChromiumError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : "Chromium PDF generation failed";
  return new QuotePdfChromiumError(traceId, message, { cause: error });
}
