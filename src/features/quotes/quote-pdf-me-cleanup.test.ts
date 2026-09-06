import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { resolveQuoteDocumentBaseUrl } from "@/features/quotes/pdf/quote-pdf-url";
import { quotePdfDownloadFilename } from "@/features/quotes/pdf/download-quote-pdf.client";

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

describe("Quote-PDF-1 manufacturing evidence removal", () => {
  it("1. admin Quote Detail no longer renders Manufacturing Evidence picker", () => {
    const detail = read("src/components/admin/quotes/QuoteDetailView.tsx");
    assert.doesNotMatch(detail, /QuoteManufacturingEvidencePicker/);
    assert.doesNotMatch(detail, /Minh chứng sản xuất/);
  });

  it("2–3. public/PDF document content does not render Manufacturing Evidence", () => {
    const content = read("src/components/quotes/QuoteDocumentContent.tsx");
    assert.doesNotMatch(content, /QuoteDocumentManufacturingEvidence/);
    assert.doesNotMatch(content, /manufacturingEvidence/);
    const meComponent = read("src/components/quotes/QuoteDocumentManufacturingEvidence.tsx");
    assert.match(meComponent, /return null/);
  });

  it("4. Manufacturing Library public surfaces remain intact", () => {
    assert.match(
      read("src/components/public/manufacturing/ManufacturingEvidenceGrid.tsx"),
      /ManufacturingEvidenceGrid/,
    );
    assert.match(
      read("src/lib/manufacturing-library.server.ts"),
      /getManufacturingEvidenceForSurfaceAsync/,
    );
  });

  it("loader choke point returns empty evidence for quotes", () => {
    const service = read("src/features/quotes/quote-manufacturing-evidence.service.ts");
    assert.match(
      service,
      /export async function getManufacturingAssetsForQuotePdf[\s\S]*?return \[\];/,
    );
  });
});

describe("Quote-PDF-1 chromium / download reliability", () => {
  it("5–7. PDF routes use nodejs runtime with chromium shell launch", () => {
    const chromium = read("src/features/quotes/pdf/quote-chromium.server.ts");
    assert.match(chromium, /headless:\s*headlessMode/);
    assert.match(chromium, /"shell"/);
    assert.match(chromium, /setGraphicsMode\s*=\s*false/);
    assert.match(chromium, /puppeteer\.defaultArgs\(/);
    assert.match(chromium, /outputFileTracingIncludes|sparticuz-bin-check/);

    const adminRoute = read("src/app/api/quotes/[id]/pdf/route.ts");
    const publicRoute = read("src/app/api/quotes/public/[token]/pdf/route.ts");
    assert.match(adminRoute, /maxDuration\s*=\s*60/);
    assert.match(publicRoute, /maxDuration\s*=\s*60/);
    assert.match(adminRoute, /runtime\s*=\s*"nodejs"/);
    assert.match(publicRoute, /runtime\s*=\s*"nodejs"/);

    const nextConfig = read("next.config.ts");
    assert.match(nextConfig, /@sparticuz\/chromium\/\*\*\/\*/);
    assert.match(nextConfig, /assets\/fonts\/quote-pdf/);

    const route = read("src/features/quotes/pdf/quote-pdf-route.ts");
    assert.match(route, /allowFallback = options\?\.allowFallback \?\? true/);
    assert.match(route, /Default ON so download works/);
    const client = read("src/features/quotes/pdf/download-quote-pdf.client.ts");
    assert.match(client, /renderer !== "pdfkit"/);
  });

  it("8–9. custom style / multi-item quote mapping remains snapshot-based", () => {
    const map = read("src/features/quotes/quote-from-pricing-map.ts");
    assert.match(map, /productId: item\.productId/);
    assert.match(map, /costEstimate: item\.costEstimate/);
    assert.match(map, /collectQuoteItemsFromPricingCalculations/);
  });

  it("10. design thumb handles missing/broken images safely", () => {
    const thumb = read("src/components/quotes/QuoteDesignThumb.tsx");
    assert.match(thumb, /onError/);
    assert.match(thumb, /!src\.trim\(\)/);
  });

  it("11–13. PDF generation loads Quote by id/token snapshots, not live batch", () => {
    const service = read("src/features/quotes/quote.service.ts");
    assert.match(service, /getQuotePdfDataById/);
    assert.match(service, /getQuotePdfDataByToken/);
    assert.match(service, /prisma\.quote\.findUnique/);
    assert.doesNotMatch(service, /pricingCostingBatch\.findUnique/);
  });

  it("14. admin PDF route keeps commercial export permission", () => {
    const adminRoute = read("src/app/api/quotes/[id]/pdf/route.ts");
    assert.match(adminRoute, /requireAdminPermission/);
    assert.match(adminRoute, /action:\s*"export"/);
  });

  it("15. financial totals helper remains unchanged entrypoint", () => {
    assert.match(
      read("src/features/quotes/quote-totals.ts"),
      /computeQuoteFromItems/,
    );
  });

  it("filename stays safe and quote-coded", () => {
    assert.equal(quotePdfDownloadFilename("BG-000003"), "bao-gia-BG-000003.pdf");
    assert.equal(quotePdfDownloadFilename("BG/000003"), "bao-gia-BG000003.pdf");
  });

  it("document base URL prefers live request host over env", () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://attd.vn";
    try {
      const base = resolveQuoteDocumentBaseUrl({
        get(name: string) {
          if (name === "x-forwarded-host") return "www.attd.vn";
          if (name === "x-forwarded-proto") return "https";
          return null;
        },
      });
      assert.equal(base, "https://www.attd.vn");
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = prev;
    }
  });
});
