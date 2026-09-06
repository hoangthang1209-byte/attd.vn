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

function appendDevFallbackWatermark(doc: InstanceType<typeof PDFDocument>): void {
  if (process.env.NODE_ENV === "production") return;
  doc.fontSize(8).fillColor("#9ca3af").text("PDF fallback renderer", 40, doc.page.height - 30, {
    align: "center",
    width: doc.page.width - 80,
  });
  doc.fillColor("#000000");
}

/** Minimal PDF when full layout fails — must not throw for valid quote data. */
export async function generateFallbackQuotePdf(data: QuotePdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
  const bufferPromise = renderPdfToBuffer(doc);
  const fonts = registerQuotePdfFonts(doc);
  if (!fonts.usedUnicodeFont) {
    throw new Error(
      "PDFKit Unicode fonts missing (DejaVu). Cannot generate Vietnamese-safe fallback PDF.",
    );
  }
  const pageW = safeDim(doc.page.width - 72, 400);

  doc.font(fonts.boldName, 18).text("ATTD", { align: "center" });
  doc.font(fonts.boldName, 16).text("BẢNG BÁO GIÁ", { align: "center" });
  doc.moveDown(0.6);
  doc.font(fonts.regularName, 11);
  doc.text(`Mã báo giá: ${safeDash(data.quoteNo)}`);
  doc.text(`Ngày báo giá: ${safeDate(data.quoteDate)}`);
  doc.text(`Hiệu lực đến: ${safeDate(data.validUntil)}`);
  doc.text(`Loại tiền: ${safeDash(data.currency)}`);
  doc.text(`Loại giá: ${safePriceType(data.priceVatType)}`);
  doc.moveDown(0.5);
  doc.font(fonts.boldName, 11).text("Khách hàng");
  doc.font(fonts.regularName, 11);
  doc.text(`Công ty: ${safeDash(data.customerCompany)}`);
  doc.text(`Mã số thuế: ${safeDash(data.customerTaxCode)}`);
  doc.text(`Địa chỉ: ${safeDash(data.customerAddress)}`);
  doc.text(`Người liên hệ: ${safeDash(data.customerContactName)}`);
  if (safeText(data.salesName).trim()) {
    doc.text(`Nhân viên tư vấn: ${safeDash(data.salesName)}`);
  }
  doc.moveDown(0.6);

  const items = Array.isArray(data.items) ? data.items : [];
  items.forEach((item, idx) => {
    const label = [item.productNameSnapshot, item.variantNameSnapshot]
      .map((part) => safeText(part).trim())
      .filter(Boolean)
      .join(" · ");
    doc.font(fonts.boldName, 11).text(`${idx + 1}. ${label || "Sản phẩm"}`);
    doc.font(fonts.regularName, 10);
    doc.text(
      `Số lượng: ${safeNumber(item.quantity)} ${safeDash(item.unit)} | Đơn giá: ${safeMoney(item.unitPrice, data.currency)} | Tổng: ${safeMoney(item.lineTotal, data.currency)} | Thiết kế: ${designCellLabel(item)}`,
      { width: pageW },
    );
    doc.moveDown(0.35);
  });

  const displayTotal =
    data.manualOverride && data.manualTotalAmount != null
      ? safeNumber(data.manualTotalAmount)
      : safeNumber(data.totalAmount);

  doc.moveDown(0.5);
  doc.font(fonts.boldName, 13).text(
    `Tổng cộng: ${safeMoney(displayTotal, data.currency)}`,
    { align: "right" },
  );

  const note = safeText(data.customerNote).trim();
  if (note) {
    doc.moveDown(0.5);
    doc.font(fonts.boldName, 11).text("Ghi chú:");
    doc.font(fonts.regularName, 10).text(note, { width: pageW });
  }

  const terms = safeText(data.terms).trim();
  if (terms) {
    doc.moveDown(0.5);
    doc.font(fonts.boldName, 11).text("Điều khoản báo giá:");
    doc.font(fonts.regularName, 10).text(terms, { width: pageW });
  }

  const preparedBy = safeText(data.preparedBy).trim();
  if (preparedBy) {
    doc.moveDown(0.5);
    doc.font(fonts.regularName, 10).text(`Người lập: ${preparedBy}`, { align: "right" });
  }

  appendDevFallbackWatermark(doc);
  doc.end();
  return bufferPromise;
}
