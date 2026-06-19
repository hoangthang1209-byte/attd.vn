import PDFDocument from "pdfkit";
import type { QuotePdfData } from "@/features/quotes/quote-document";
import { formatQuoteDate } from "@/features/quotes/format";
import {
  formatQuoteMoney,
  formatQuoteMoq,
  formatQuotePriceTypeLabel,
} from "@/features/quotes/quote-format";
import { quotePriceVatTypeLabel } from "@/features/quotes/labels";
import { registerQuotePdfFonts } from "@/features/quotes/pdf/quote-pdf-fonts";

function textOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function designCellLabel(item: QuotePdfData["items"][number]): string {
  if (item.designImageUrl?.trim()) return "Có";
  return "—";
}

function drawCell(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  fonts: { regularName: string; boldName: string },
  opts: { bold?: boolean; align?: "left" | "center" | "right"; fontSize?: number } = {},
) {
  const fontSize = opts.fontSize ?? 7;
  doc.font(opts.bold ? fonts.boldName : fonts.regularName, fontSize);
  doc.rect(x, y, w, h).stroke("#cccccc");
  doc.text(textOrDash(text), x + 2, y + 3, {
    width: w - 4,
    height: h - 4,
    align: opts.align ?? "left",
    ellipsis: true,
  });
}

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

export async function generateQuotePdf(data: QuotePdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28 });
  const bufferPromise = renderPdfToBuffer(doc);

  const fonts = registerQuotePdfFonts(doc);

  doc.font(fonts.boldName, 16).text("BẢNG BÁO GIÁ", { align: "center" });
  doc.font(fonts.regularName, 10);
  if (data.company?.brandName) {
    doc.text(data.company.brandName, { align: "center" });
  }
  doc.moveDown(0.5);
  doc.font(fonts.regularName, 9);
  doc.text(`Mã báo giá: ${textOrDash(data.quoteNo)}`);
  doc.text(`Ngày báo giá: ${formatQuoteDate(data.quoteDate)}`);
  doc.text(`Hiệu lực đến: ${formatQuoteDate(data.validUntil)}`);
  doc.text(
    `Loại tiền: ${textOrDash(data.currency)}   Loại giá: ${quotePriceVatTypeLabel(data.priceVatType)}`,
  );
  doc.moveDown(0.5);

  const startY = doc.y;
  doc.font(fonts.boldName, 8).text("Thông tin khách hàng", 28, startY);
  doc.font(fonts.regularName, 7);
  let y = startY + 12;
  const leftFields: [string, string | null | undefined][] = [
    ["Đơn vị", data.customerCompany],
    ["MST", data.customerTaxCode],
    ["Địa chỉ", data.customerAddress],
    ["Liên hệ", data.customerContactName],
    ["Chức vụ", data.customerContactTitle],
    ["ĐT", data.customerPhone],
    ["Email", data.customerEmail],
  ];
  for (const [label, val] of leftFields) {
    const display = val?.trim();
    if (display) {
      doc.text(`${label}: ${display}`, 28, y, { width: 360 });
      y += 10;
    }
  }

  doc.font(fonts.boldName, 8).text("Nhân viên tư vấn", 400, startY);
  doc.font(fonts.regularName, 7);
  let sy = startY + 12;
  const salesFields: [string, string | null | undefined][] = [
    ["Tên", data.salesName],
    ["ĐT", data.salesPhone],
    ["Email", data.salesEmail],
    ["Địa chỉ", data.salesAddress],
  ];
  for (const [label, val] of salesFields) {
    const display = val?.trim();
    if (display) {
      doc.text(`${label}: ${display}`, 400, sy, { width: 360 });
      sy += 10;
    }
  }

  let tableY = Math.max(y, sy) + 16;

  const headers = [
    "STT",
    "Thiết kế",
    "Màu",
    "Danh mục",
    "Giới tính",
    "Sản phẩm",
    "SKU",
    "Mô tả",
    "MOQ",
    "Ghi chú",
    "SL",
    "ĐV",
    "Loại giá",
    "Đơn giá",
    "Tổng",
  ];
  if (data.showProductionLeadTime) headers.push("TG SX");
  if (data.showSampleFee) headers.push("Phí mẫu");
  if (data.showSampleLeadTime) headers.push("TG mẫu");

  const pageW = doc.page.width - 56;
  const colCount = headers.length;
  const baseW = pageW / colCount;
  const rowH = 22;
  let x = 28;

  headers.forEach((h) => {
    drawCell(doc, h, x, tableY, baseW, rowH, fonts, {
      bold: true,
      fontSize: 6,
      align: "center",
    });
    x += baseW;
  });

  tableY += rowH;
  data.items.forEach((item, idx) => {
    x = 28;
    const priceType = formatQuotePriceTypeLabel(data.priceVatType);
    const productLabel =
      [item.productNameSnapshot, item.variantNameSnapshot]
        .filter((part) => part?.trim())
        .join(" · ") || "—";

    const cells: string[] = [
      String(idx + 1),
      designCellLabel(item),
      textOrDash(item.colorSnapshot),
      textOrDash(item.categorySnapshot),
      textOrDash(item.genderSnapshot),
      productLabel,
      textOrDash(item.skuSnapshot),
      textOrDash(item.description),
      formatQuoteMoq(item.moqSnapshot),
      textOrDash(item.itemNote),
      String(item.quantity ?? 0),
      textOrDash(item.unit),
      priceType,
      formatQuoteMoney(item.unitPrice, data.currency),
      formatQuoteMoney(item.lineTotal, data.currency),
    ];

    if (data.showProductionLeadTime) {
      cells.push(textOrDash(item.productionLeadTime));
    }
    if (data.showSampleFee) {
      cells.push(
        item.sampleFee != null
          ? formatQuoteMoney(item.sampleFee, data.currency)
          : "—",
      );
    }
    if (data.showSampleLeadTime) {
      cells.push(textOrDash(item.sampleLeadTime));
    }

    cells.forEach((cell) => {
      drawCell(doc, cell, x, tableY, baseW, rowH, fonts, { fontSize: 6 });
      x += baseW;
    });
    tableY += rowH;
  });

  tableY += 8;
  doc.font(fonts.regularName, 9);
  const displayTotal =
    data.manualOverride && data.manualTotalAmount != null
      ? data.manualTotalAmount
      : data.totalAmount;
  doc.text(`Tổng cộng: ${formatQuoteMoney(displayTotal, data.currency)}`, 28, tableY, {
    align: "right",
    width: pageW,
  });

  if (data.customerNote?.trim()) {
    tableY += 20;
    doc.font(fonts.boldName, 9).text("Ghi chú gửi khách:", 28, tableY);
    doc.font(fonts.regularName, 8).text(data.customerNote.trim(), 28, tableY + 12, {
      width: pageW,
    });
  }

  if (data.terms?.trim()) {
    tableY += 40;
    doc.font(fonts.boldName, 9).text("Điều khoản báo giá:", 28, tableY);
    doc.font(fonts.regularName, 7).text(data.terms.trim(), 28, tableY + 12, {
      width: pageW,
    });
  }

  if (data.preparedBy?.trim()) {
    doc.font(fonts.regularName, 9).text(`Người lập: ${data.preparedBy.trim()}`, 28, doc.page.height - 60, {
      align: "right",
      width: pageW,
    });
  }

  doc.end();
  return bufferPromise;
}

export function quotePdfFilename(quoteNo: string): string {
  return `bao-gia-${quoteNo.replace(/[^a-zA-Z0-9-]/g, "")}.pdf`;
}
