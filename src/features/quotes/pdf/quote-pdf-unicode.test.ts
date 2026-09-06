import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import PDFDocument from "pdfkit";
import {
  registerQuotePdfFonts,
  resolveQuotePdfFontPaths,
} from "@/features/quotes/pdf/quote-pdf-fonts";
import { generateFallbackQuotePdf } from "@/features/quotes/pdf/quote-pdf-fallback";
import type { QuotePdfData } from "@/features/quotes/quote-document";

const root = process.cwd();

function buildSampleQuote(): QuotePdfData {
  return {
    quoteNo: "BG-TEST-UNICODE",
    status: "SENT",
    title: "Báo giá thử Unicode",
    validUntil: "2026-02-15",
    quoteDate: "2026-01-15",
    currency: "VND",
    priceVatType: "EXCLUDING_VAT",
    customerCompany: "Công Ty TNHH Sản Xuất May Mặc Việt Nam",
    customerCode: "AXXEL",
    customerTaxCode: "0312345678",
    customerAddress: "123 Đường Nguyễn Huệ, Quận 1, TP.HCM",
    customerCompanyPhone: null,
    customerCompanyEmail: null,
    customerContactName: "Nguyễn Văn A",
    customerContactTitle: null,
    customerContactPhone: null,
    customerContactEmail: null,
    customerPhone: null,
    customerEmail: null,
    salesName: "Trần Thị B",
    salesTitle: null,
    salesPhone: null,
    salesEmail: null,
    salesAddress: null,
    preparedBy: "ATTD",
    subtotal: 1_500_000,
    discountAmount: 0,
    shippingFee: 0,
    vatRate: 0,
    vatAmount: 0,
    totalAmount: 1_500_000,
    manualOverride: false,
    manualTotalAmount: null,
    customerNote: null,
    terms: "Điều khoản báo giá: thanh toán 50% đặt cọc, 50% trước giao hàng.",
    sampleFee: null,
    sampleLeadTime: null,
    sampleRefundCondition: null,
    showProductionLeadTime: false,
    showSampleFee: false,
    showSampleLeadTime: false,
    manufacturingEvidence: [],
    items: [
      {
        designImageUrl: null,
        colorSnapshot: "Trắng",
        categorySnapshot: "Áo thun",
        genderSnapshot: null,
        productNameSnapshot: "Áo thun cotton",
        variantNameSnapshot: "Trắng / L",
        skuSnapshot: "AT-001",
        description: "Sản phẩm đồng phục",
        moqSnapshot: null,
        itemNote: null,
        quantity: 100,
        unit: "cái",
        unitPrice: 15_000,
        lineTotal: 1_500_000,
        productionLeadTime: null,
        sampleFee: null,
        sampleLeadTime: null,
      },
    ],
    company: {
      brandName: "ATTD",
      legalName: "Công Ty TNHH Sản Xuất May Mặc Việt Nam",
      taxCode: "0311111111",
      address: "Địa chỉ kho hàng ATTD",
      phone: "0900000000",
      email: "hello@attd.vn",
      website: "https://attd.vn",
    },
  };
}

describe("Quote-PDF-2 Vietnamese Unicode PDFKit", () => {
  it("packages DejaVu fonts in application assets", () => {
    assert.ok(existsSync(path.join(root, "assets/fonts/quote-pdf/DejaVuSans.ttf")));
    assert.ok(existsSync(path.join(root, "assets/fonts/quote-pdf/DejaVuSans-Bold.ttf")));
    const paths = resolveQuotePdfFontPaths();
    assert.ok(paths.regularPath?.includes("assets/fonts/quote-pdf/DejaVuSans.ttf"));
    assert.ok(paths.boldPath?.includes("assets/fonts/quote-pdf/DejaVuSans-Bold.ttf"));
  });

  it("registers Unicode-capable fonts instead of Helvetica", () => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const fonts = registerQuotePdfFonts(doc);
    assert.equal(fonts.usedUnicodeFont, true);
    assert.equal(fonts.fontFamily, "dejavu");
    assert.notEqual(fonts.regularName, "Helvetica");
    assert.notEqual(fonts.boldName, "Helvetica-Bold");
    doc.end();
  });

  it("forced PDFKit fallback embeds DejaVu Identity-H (not Helvetica/WinAnsi)", async () => {
    const buffer = await generateFallbackQuotePdf(buildSampleQuote());
    assert.ok(buffer.length > 5_000);
    assert.equal(buffer.subarray(0, 5).toString("ascii"), "%PDF-");

    const binary = buffer.toString("latin1");
    assert.match(binary, /DejaVuSans/);
    assert.match(binary, /DejaVuSans-Bold/);
    assert.match(binary, /Identity-H/);
    assert.match(binary, /ToUnicode/);
    assert.doesNotMatch(binary, /\/BaseFont\s*\/Helvetica/);
    assert.doesNotMatch(binary, /WinAnsiEncoding/);

    assert.doesNotMatch(
      readFileSync(path.join(root, "src/features/quotes/pdf/quote-pdf-fonts.ts"), "utf8"),
      /strip accents|removeDiacritics|toAscii/i,
    );
  });
});
