import PDFDocument from "pdfkit";
import type { QuotePdfData } from "@/features/quotes/quote-document";
import { registerQuotePdfFonts } from "@/features/quotes/pdf/quote-pdf-fonts";
import {
  designCellLabel,
  safeDash,
  safeDate,
  safeDim,
  safeMoney,
  safeNumber,
  safePriceType,
  safeText,
} from "@/features/quotes/pdf/quote-pdf-safe";

function renderPdfToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

/** Minimal PDF when full layout fails — must not throw for valid quote data. */
export async function generateFallbackQuotePdf(data: QuotePdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const bufferPromise = renderPdfToBuffer(doc);
  const fonts = registerQuotePdfFonts(doc);
  const pageW = safeDim(doc.page.width - 80, 400);

  doc.font(fonts.boldName, 16).text("ATTD", { align: "center" });
  doc.font(fonts.boldName, 14).text("BANG BAO GIA", { align: "center" });
  doc.moveDown(0.5);
  doc.font(fonts.regularName, 10);
  doc.text(`Ma bao gia: ${safeDash(data.quoteNo)}`);
  doc.text(`Ngay bao gia: ${safeDate(data.quoteDate)}`);
  doc.text(`Hieu luc den: ${safeDate(data.validUntil)}`);
  doc.text(`Loai tien: ${safeDash(data.currency)}`);
  doc.text(`Loai gia: ${safePriceType(data.priceVatType)}`);
  doc.moveDown(0.5);
  doc.text(`Khach hang: ${safeDash(data.customerCompany)}`);
  doc.text(`Lien he: ${safeDash(data.customerContactName)}`);
  doc.moveDown(0.5);

  const items = Array.isArray(data.items) ? data.items : [];
  items.forEach((item, idx) => {
    const label = [item.productNameSnapshot, item.variantNameSnapshot]
      .map((part) => safeText(part).trim())
      .filter(Boolean)
      .join(" · ");
    doc.font(fonts.boldName, 9).text(`${idx + 1}. ${label || "San pham"}`);
    doc.font(fonts.regularName, 8);
    doc.text(
      `SL: ${safeNumber(item.quantity)} ${safeDash(item.unit)} | Don gia: ${safeMoney(item.unitPrice, data.currency)} | Tong: ${safeMoney(item.lineTotal, data.currency)} | Thiet ke: ${designCellLabel(item)}`,
      { width: pageW },
    );
    doc.moveDown(0.3);
  });

  const displayTotal =
    data.manualOverride && data.manualTotalAmount != null
      ? safeNumber(data.manualTotalAmount)
      : safeNumber(data.totalAmount);

  doc.moveDown(0.5);
  doc.font(fonts.boldName, 11).text(
    `Tong cong: ${safeMoney(displayTotal, data.currency)}`,
    { align: "right" },
  );

  const note = safeText(data.customerNote).trim();
  if (note) {
    doc.moveDown(0.5);
    doc.font(fonts.boldName, 9).text("Ghi chu:");
    doc.font(fonts.regularName, 8).text(note, { width: pageW });
  }

  const terms = safeText(data.terms).trim();
  if (terms) {
    doc.moveDown(0.5);
    doc.font(fonts.boldName, 9).text("Dieu khoan:");
    doc.font(fonts.regularName, 8).text(terms, { width: pageW });
  }

  const preparedBy = safeText(data.preparedBy).trim();
  if (preparedBy) {
    doc.moveDown(0.5);
    doc.text(`Nguoi lap: ${preparedBy}`, { align: "right" });
  }

  doc.end();
  return bufferPromise;
}
