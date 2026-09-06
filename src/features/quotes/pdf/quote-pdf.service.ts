import "server-only";

import PDFDocument from "pdfkit";
import type { QuotePdfData } from "@/features/quotes/quote-document";
import { registerQuotePdfFonts } from "@/features/quotes/pdf/quote-pdf-fonts";
import { generateFallbackQuotePdf } from "@/features/quotes/pdf/quote-pdf-fallback";
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

type PdfFonts = ReturnType<typeof registerQuotePdfFonts>;

type TableColumn = {
  header: string;
  width: number;
  value: (item: QuotePdfData["items"][number], idx: number, data: QuotePdfData) => string;
};

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

function drawCell(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  fonts: PdfFonts,
  opts: { bold?: boolean; align?: "left" | "center" | "right"; fontSize?: number } = {},
) {
  const fontSize = safeDim(opts.fontSize ?? 7, 5);
  const width = safeDim(w, 8);
  const height = safeDim(h, 10);
  const posX = Number.isFinite(x) ? x : 28;
  const posY = Number.isFinite(y) ? y : 28;

  doc.font(opts.bold ? fonts.boldName : fonts.regularName, fontSize);
  doc.rect(posX, posY, width, height).stroke("#cccccc");
  doc.text(safeDash(text), posX + 2, posY + 2, {
    width: safeDim(width - 4, 4),
    height: safeDim(height - 4, 4),
    align: opts.align ?? "left",
    ellipsis: true,
  });
}

function buildTableColumns(data: QuotePdfData): TableColumn[] {
  const cols: TableColumn[] = [
    {
      header: "STT",
      width: 22,
      value: (_item, idx) => String(idx + 1),
    },
    {
      header: "Thiết kế",
      width: 34,
      value: (item) => designCellLabel(item),
    },
    {
      header: "Màu",
      width: 44,
      value: (item) => safeDash(item.colorSnapshot),
    },
    {
      header: "Danh mục",
      width: 52,
      value: (item) => safeDash(item.categorySnapshot),
    },
    {
      header: "Sản phẩm",
      width: 110,
      value: (item) => {
        const label = [item.productNameSnapshot, item.variantNameSnapshot]
          .map((part) => safeText(part).trim())
          .filter(Boolean)
          .join(" · ");
        return label || "-";
      },
    },
    {
      header: "SKU",
      width: 58,
      value: (item) => safeDash(item.skuSnapshot),
    },
    {
      header: "Mô tả",
      width: 72,
      value: (item) => safeDash(item.description),
    },
    {
      header: "SL",
      width: 26,
      value: (item) => String(safeNumber(item.quantity)),
    },
    {
      header: "ĐV",
      width: 26,
      value: (item) => safeDash(item.unit),
    },
    {
      header: "Loại giá",
      width: 52,
      value: (_item, _idx, quote) => safePriceType(quote.priceVatType),
    },
    {
      header: "Đơn giá",
      width: 58,
      value: (item, _idx, quote) => safeMoney(item.unitPrice, quote.currency),
    },
    {
      header: "Tổng",
      width: 58,
      value: (item, _idx, quote) => safeMoney(item.lineTotal, quote.currency),
    },
  ];

  if (data.showProductionLeadTime) {
    cols.push({
      header: "TG SX",
      width: 44,
      value: (item) => safeDash(item.productionLeadTime),
    });
  }
  if (data.showSampleFee) {
    cols.push({
      header: "Phí mẫu",
      width: 44,
      value: (item, _idx, quote) => safeMoney(item.sampleFee, quote.currency),
    });
  }
  if (data.showSampleLeadTime) {
    cols.push({
      header: "TG mẫu",
      width: 44,
      value: (item) => safeDash(item.sampleLeadTime),
    });
  }

  return cols;
}

function scaleColumns(columns: TableColumn[], maxWidth: number): TableColumn[] {
  const total = columns.reduce((sum, col) => sum + col.width, 0);
  if (total <= maxWidth || total <= 0) return columns;
  const ratio = maxWidth / total;
  return columns.map((col) => ({
    ...col,
    width: safeDim(Math.floor(col.width * ratio), 18),
  }));
}

function drawPartyBlock(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  title: string,
  fields: [string, unknown][],
  x: number,
  y: number,
  width: number,
) {
  const blockW = safeDim(width, 80);
  doc.font(fonts.boldName, 8).text(title, x, y, { width: blockW - 4 });
  let rowY = y + 14;
  doc.font(fonts.regularName, 7);
  for (const [label, val] of fields) {
    const display = safeText(val).trim();
    if (display) {
      doc.text(`${label}: ${display}`, x, rowY, { width: blockW - 6 });
      rowY += 10;
    }
  }
}

export async function generateQuotePdf(data: QuotePdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28 });
  const bufferPromise = renderPdfToBuffer(doc);
  const fonts = registerQuotePdfFonts(doc);
  if (!fonts.usedUnicodeFont) {
    throw new Error(
      "PDFKit Unicode fonts missing (DejaVu). Cannot generate Vietnamese-safe quote PDF.",
    );
  }
  const company = data.company;
  const pageW = safeDim(doc.page.width - 56, 500);
  const colW = safeDim(pageW / 3, 120);

  doc.font(fonts.boldName, 18).text("BẢNG BÁO GIÁ", { align: "center" });
  doc.moveDown(0.3);
  if (safeText(company?.brandName).trim()) {
    doc.font(fonts.boldName, 11).text(safeText(company?.brandName), { align: "center" });
  }
  const legalName = safeText(company?.legalName).trim();
  const brandName = safeText(company?.brandName).trim();
  if (legalName && legalName !== brandName) {
    doc.font(fonts.regularName, 9).text(legalName, { align: "center" });
  }
  doc.font(fonts.regularName, 8);
  if (safeText(company?.taxCode).trim()) {
    doc.text(`Mã số thuế: ${safeText(company?.taxCode).trim()}`, { align: "center" });
  }
  if (safeText(company?.address).trim()) {
    doc.text(`Địa chỉ: ${safeText(company?.address).trim()}`, { align: "center" });
  }
  const companyContact = [
    safeText(company?.phone).trim() ? `Điện thoại: ${safeText(company?.phone).trim()}` : "",
    safeText(company?.email).trim() ? `Email: ${safeText(company?.email).trim()}` : "",
    safeText(company?.website).trim() ? `Website: ${safeText(company?.website).trim()}` : "",
  ]
    .filter(Boolean)
    .join("   ");
  if (companyContact) doc.text(companyContact, { align: "center" });

  doc.moveDown(0.6);
  doc.font(fonts.regularName, 8);
  doc.text(
    `Mã báo giá: ${safeDash(data.quoteNo)}   Ngày: ${safeDate(data.quoteDate)}   Hiệu lực: ${safeDate(data.validUntil)}   ${safeDash(data.currency)} · ${safePriceType(data.priceVatType)}`,
    { align: "center" },
  );
  doc.moveDown(0.5);

  const blockY = doc.y;
  drawPartyBlock(
    doc,
    fonts,
    "Khách hàng",
    [
      ["Công ty", data.customerCompany],
      ["Mã KH", data.customerCode],
      ["MST", data.customerTaxCode],
      ["Địa chỉ", data.customerAddress],
      ["ĐT", data.customerCompanyPhone],
      ["Email", data.customerCompanyEmail],
    ],
    28,
    blockY,
    colW,
  );
  drawPartyBlock(
    doc,
    fonts,
    "Người liên hệ",
    [
      ["Họ tên", data.customerContactName],
      ["Chức vụ", data.customerContactTitle],
      ["ĐT", data.customerContactPhone],
      ["Email", data.customerContactEmail],
    ],
    28 + colW,
    blockY,
    colW,
  );
  drawPartyBlock(
    doc,
    fonts,
    "Nhân viên tư vấn",
    [
      ["Tên", data.salesName],
      ["Chức vụ", data.salesTitle],
      ["ĐT", data.salesPhone],
      ["Email", data.salesEmail],
      ["Địa chỉ", data.salesAddress],
    ],
    28 + colW * 2,
    blockY,
    colW,
  );

  let tableY = blockY + 72;
  const columns = scaleColumns(buildTableColumns(data), pageW);
  const rowH = 22;
  let x = 28;

  columns.forEach((col) => {
    drawCell(doc, col.header, x, tableY, col.width, rowH, fonts, {
      bold: true,
      fontSize: 6,
      align: "center",
    });
    x += col.width;
  });

  tableY += rowH;
  const items = Array.isArray(data.items) ? data.items : [];

  items.forEach((item, idx) => {
    x = 28;
    columns.forEach((col) => {
      drawCell(doc, col.value(item, idx, data), x, tableY, col.width, rowH, fonts, {
        fontSize: 6,
      });
      x += col.width;
    });
    tableY += rowH;

    if (tableY > doc.page.height - 80) {
      doc.addPage({ size: "A4", layout: "landscape", margin: 28 });
      tableY = 28;
    }
  });

  tableY += 8;
  doc.font(fonts.regularName, 9);
  const displayTotal =
    data.manualOverride && data.manualTotalAmount != null
      ? safeNumber(data.manualTotalAmount)
      : safeNumber(data.totalAmount);
  doc.text(`Tổng cộng: ${safeMoney(displayTotal, data.currency)}`, 28, tableY, {
    align: "right",
    width: pageW,
  });

  const customerNote = safeText(data.customerNote).trim();
  if (customerNote) {
    tableY += 20;
    doc.font(fonts.boldName, 9).text("Ghi chú gửi khách:", 28, tableY);
    doc.font(fonts.regularName, 8).text(customerNote, 28, tableY + 12, { width: pageW });
  }

  const terms = safeText(data.terms).trim();
  if (terms) {
    tableY += 40;
    doc.font(fonts.boldName, 9).text("Điều khoản báo giá:", 28, tableY);
    doc.font(fonts.regularName, 7).text(terms, 28, tableY + 12, { width: pageW });
  }

  const preparedBy = safeText(data.preparedBy).trim();
  if (preparedBy) {
    doc.font(fonts.regularName, 9).text(`Người lập: ${preparedBy}`, 28, doc.page.height - 60, {
      align: "right",
      width: pageW,
    });
  }

  if (process.env.NODE_ENV !== "production") {
    doc.font(fonts.regularName, 8).fillColor("#9ca3af").text(
      "PDF fallback renderer",
      28,
      doc.page.height - 40,
      { align: "center", width: pageW },
    );
    doc.fillColor("#000000");
  }

  doc.end();
  return bufferPromise;
}

export type QuotePdfGenerationResult = {
  buffer: Buffer;
  usedFallback: boolean;
};

export async function generateQuotePdfWithFallback(
  data: QuotePdfData,
): Promise<QuotePdfGenerationResult> {
  try {
    const buffer = await generateQuotePdf(data);
    if (!buffer || buffer.length < 100) {
      throw new Error("Full PDF buffer empty or too small");
    }
    return { buffer, usedFallback: false };
  } catch (fullError) {
    console.error("[quote-pdf] Full PDF generation failed, using fallback PDF.", {
      quoteNo: data.quoteNo,
      errorName: fullError instanceof Error ? fullError.name : "UnknownError",
      errorMessage: fullError instanceof Error ? fullError.message : String(fullError),
      stack: fullError instanceof Error ? fullError.stack : undefined,
    });
    const buffer = await generateFallbackQuotePdf(data);
    if (!buffer || buffer.length < 100) {
      throw fullError;
    }
    return { buffer, usedFallback: true };
  }
}

export function quotePdfFilename(quoteNo: string): string {
  const safe = safeText(quoteNo).replace(/[^a-zA-Z0-9-]/g, "");
  return `bao-gia-${safe || "attd"}.pdf`;
}
