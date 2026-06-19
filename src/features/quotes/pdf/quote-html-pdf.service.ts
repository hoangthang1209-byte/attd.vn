import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

function resolveSiteBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

export function buildQuoteDocumentUrl(
  publicToken: string,
  options?: { mode?: "pdf" | "print" },
): string {
  const base = resolveSiteBaseUrl();
  const mode = options?.mode ?? "pdf";
  return `${base}/q/${encodeURIComponent(publicToken)}/document?mode=${mode}`;
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
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
      ),
      new Promise<void>((resolve) => setTimeout(resolve, 8000)),
    ]);
  });
}

export async function generateQuoteHtmlPdf(documentUrl: string): Promise<Buffer> {
  const executablePath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: {
      width: 1600,
      height: 1000,
      deviceScaleFactor: 1,
    },
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.emulateMediaType("screen");

    await page.goto(documentUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await page.waitForSelector(".quote-document-root", { timeout: 30000 });

    await page.evaluate(() => document.fonts.ready);
    await waitForImagesOnPage(page);

    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: {
        top: "8mm",
        right: "8mm",
        bottom: "8mm",
        left: "8mm",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function generateQuoteHtmlPdfByToken(publicToken: string): Promise<Buffer> {
  const url = buildQuoteDocumentUrl(publicToken, { mode: "pdf" });
  return generateQuoteHtmlPdf(url);
}
