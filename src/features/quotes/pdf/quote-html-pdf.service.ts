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

export function buildQuoteDocumentUrl(publicToken: string): string {
  return `${resolveSiteBaseUrl()}/q/${encodeURIComponent(publicToken)}/document`;
}

export async function generateQuoteHtmlPdf(documentUrl: string): Promise<Buffer> {
  const executablePath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 900 },
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.goto(documentUrl, {
      waitUntil: "networkidle0",
      timeout: 45000,
    });

    await page.evaluate(() => document.fonts.ready);

    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: {
        top: "10mm",
        right: "8mm",
        bottom: "10mm",
        left: "8mm",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function generateQuoteHtmlPdfByToken(publicToken: string): Promise<Buffer> {
  const url = buildQuoteDocumentUrl(publicToken);
  return generateQuoteHtmlPdf(url);
}
