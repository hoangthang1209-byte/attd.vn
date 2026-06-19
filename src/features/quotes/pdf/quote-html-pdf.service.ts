import { existsSync } from "fs";
import puppeteer, { type Browser, type PDFOptions } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import {
  buildQuoteDocumentUrl,
  resolveQuoteDocumentBaseUrl,
} from "@/features/quotes/pdf/quote-pdf-url";

export { buildQuoteDocumentUrl, resolveQuoteDocumentBaseUrl };

type HtmlPdfOptions = {
  publicToken: string;
  quoteNo?: string;
  itemCount?: number;
  imageCount?: number;
  requestHeaders?: Headers;
};

const PDF_VIEWPORT = {
  width: 1400,
  height: 990,
  deviceScaleFactor: 1,
} as const;

const PDF_OPTIONS: PDFOptions = {
  format: "A4",
  landscape: true,
  printBackground: true,
  preferCSSPageSize: true,
  margin: {
    top: "8mm",
    right: "8mm",
    bottom: "8mm",
    left: "8mm",
  },
};

function resolveLocalChromePath(): string | null {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean) as string[];

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

async function launchChromiumBrowser(): Promise<{
  browser: Browser;
  executablePath: string;
  launchMode: "vercel" | "local-chrome" | "sparticuz-local";
}> {
  const isVercel = Boolean(process.env.VERCEL);

  if (isVercel) {
    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: [...chromium.args, "--disable-dev-shm-usage", "--single-process"],
      defaultViewport: PDF_VIEWPORT,
      executablePath,
      headless: true,
    });
    return { browser, executablePath, launchMode: "vercel" };
  }

  const localChrome = resolveLocalChromePath();
  if (localChrome) {
    const browser = await puppeteer.launch({
      executablePath: localChrome,
      headless: true,
      defaultViewport: PDF_VIEWPORT,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    return { browser, executablePath: localChrome, launchMode: "local-chrome" };
  }

  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: [...chromium.args, "--no-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: PDF_VIEWPORT,
    executablePath,
    headless: true,
  });
  return { browser, executablePath, launchMode: "sparticuz-local" };
}

async function waitForImagesOnPage(page: import("puppeteer-core").Page): Promise<void> {
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.race([
      Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
        ),
      ),
      new Promise<void>((resolve) => setTimeout(resolve, 10000)),
    ]);
  });
}

function isValidPdfBuffer(buffer: Buffer): boolean {
  return buffer.length > 500 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

function logChromiumEnvironment(executablePath: string, launchMode: string): void {
  console.info("[quote-pdf] chromium environment", {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL ?? null,
    launchMode,
    executablePath,
  });
}

export async function generateQuoteHtmlPdf(
  documentUrl: string,
  meta?: Pick<HtmlPdfOptions, "quoteNo" | "itemCount" | "imageCount">,
): Promise<Buffer> {
  console.info("[quote-pdf] document url:", documentUrl);
  console.info("[quote-pdf] renderer=chromium attempt", {
    quoteNo: meta?.quoteNo,
    itemCount: meta?.itemCount,
    imageCount: meta?.imageCount,
  });

  let browser: Browser | null = null;
  let executablePath = "";
  let launchMode = "unknown";

  try {
    const launch = await launchChromiumBrowser();
    browser = launch.browser;
    executablePath = launch.executablePath;
    launchMode = launch.launchMode;
    logChromiumEnvironment(executablePath, launchMode);

    const page = await browser.newPage();
    await page.setViewport(PDF_VIEWPORT);
    await page.emulateMediaType("screen");

    await page.goto(documentUrl, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });

    await page.waitForSelector(".quote-document-root", { timeout: 30000 });

    try {
      await page.waitForSelector('[data-quote-pdf-ready="true"]', { timeout: 20000 });
    } catch {
      console.warn("[quote-pdf] data-quote-pdf-ready timeout — continuing with fonts/images wait");
      await page.evaluate(() => document.fonts.ready);
      await waitForImagesOnPage(page);
    }

    const pdf = await page.pdf(PDF_OPTIONS);
    const buffer = Buffer.from(pdf);

    if (!isValidPdfBuffer(buffer)) {
      throw new Error(
        `Chromium returned invalid PDF buffer (length=${buffer.length}, head=${buffer.subarray(0, 16).toString("ascii")})`,
      );
    }

    console.info("[quote-pdf] renderer=chromium success", {
      quoteNo: meta?.quoteNo,
      bytes: buffer.length,
    });

    return buffer;
  } catch (err) {
    console.error("[quote-pdf] chromium failed:", err instanceof Error ? err.message : err);
    console.error("[quote-pdf] chromium failed stack:", err instanceof Error ? err.stack : undefined);
    console.error("[quote-pdf] chromium failed context", {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL ?? null,
      executablePath: executablePath || "(not resolved)",
      launchMode,
      documentUrl,
      quoteNo: meta?.quoteNo,
    });
    throw err;
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
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
