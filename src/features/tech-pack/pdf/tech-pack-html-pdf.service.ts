import "server-only";

import puppeteer, { type Browser, type PDFOptions } from "puppeteer-core";
import { resolveChromiumExecutablePath } from "@/features/quotes/pdf/quote-chromium.server";
import { buildTechPackDocumentUrl, resolveTechPackDocumentBaseUrl } from "@/features/tech-pack/pdf/tech-pack-pdf-url";

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
const DOCUMENT_FETCH_USER_AGENT = "ATTD Tech Pack PDF Renderer";

function logStage(traceId: string, stage: string, extra?: Record<string, unknown>) {
  console.log("[tech-pack-pdf]", { traceId, stage, ...extra });
}

function isValidPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= MIN_PDF_BYTES && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

async function closeBrowserSafely(traceId: string, browser: Browser | null) {
  if (!browser) return;
  try {
    await browser.close();
  } catch (closeError) {
    console.error("[tech-pack-pdf] browser close failed", { traceId, closeError });
  }
}

export async function generateTechPackHtmlPdf(
  documentUrl: string,
  meta?: { techPackId?: string },
): Promise<Buffer> {
  const traceId = `tp-${Date.now()}`;
  const techPackId = meta?.techPackId ?? "unknown";
  let browser: Browser | null = null;

  logStage(traceId, "start", { documentUrl, techPackId });

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
      throw new Error(`Document page returned HTTP ${pageStatus || "unknown"}`);
    }

    await page.waitForSelector(".tech-pack-document-root", { timeout: 30_000 });
    await page.waitForSelector('html[data-tech-pack-pdf-ready="true"]', { timeout: 30_000 });
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
      throw new Error("Chromium returned an invalid PDF buffer.");
    }

    logStage(traceId, "complete", { techPackId, bytes: buffer.length });
    return buffer;
  } catch (error) {
    console.error("[tech-pack-pdf] chromium failed", { traceId, techPackId, documentUrl, error });
    throw error;
  } finally {
    await closeBrowserSafely(traceId, browser);
  }
}

export async function generateTechPackHtmlPdfForDocument(input: {
  techPackId: string;
  pdfToken: string;
  requestHeaders?: Headers;
}): Promise<Buffer> {
  const baseUrl = resolveTechPackDocumentBaseUrl(input.requestHeaders);
  const documentUrl = buildTechPackDocumentUrl(input.techPackId, {
    baseUrl,
    pdfToken: input.pdfToken,
  });

  const probe = await fetch(documentUrl, {
    headers: { "User-Agent": DOCUMENT_FETCH_USER_AGENT },
    cache: "no-store",
    redirect: "follow",
  });
  if (!probe.ok) {
    throw new Error(`Document URL fetch returned HTTP ${probe.status}`);
  }

  return generateTechPackHtmlPdf(documentUrl, { techPackId: input.techPackId });
}
