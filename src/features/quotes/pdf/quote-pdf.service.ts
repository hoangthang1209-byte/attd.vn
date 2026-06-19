import PDFDocument from "pdfkit";
import { join } from "path";
import type { QuotePdfData } from "@/features/quotes/quote-document";
import { formatQuoteDate } from "@/features/quotes/format";
import { formatQuoteMoney, formatQuoteMoq, formatQuotePriceTypeLabel } from "@/features/quotes/quote-format";
import { quotePriceVatTypeLabel } from "@/features/quotes/labels";

const DEJAVU_FONT = join(process.cwd(), "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf");
const DEJAVU_BOLD = join(process.cwd(), "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf");

function drawCell(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { bold?: boolean; align?: "left" | "center" | "right"; fontSize?: number } = {}
) {
  const fontSize = opts.fontSize ?? 7;
  doc.font(opts.bold ? DEJAVU_BOLD : DEJAVU_FONT, fontSize);
  doc.rect(x, y, w, h).stroke("#cccccc");
  doc.text(text || "—", x + 2, y + 3, {
    width: w - 4,
    height: h - 4,
    align: opts.align ?? "left",
    ellipsis: true,
  });
}

export async function generateQuotePdf(data: QuotePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const company = data.company;
    doc.font(DEJAVU_BOLD, 16).text("BẢNG BÁO GIÁ", { align: "center" });
    doc.font(DEJAVU_FONT, 10);
    if (company?.brandName) doc.text(company.brandName, { align: "center" });
    doc.moveDown(0.5);
    doc.font(DEJAVU_FONT, 9);
    doc.text(`Mã báo giá: ${data.quoteNo}`, { continued: true });
    doc.text(`   Ngày báo giá: ${formatQuoteDate(data.quoteDate)}`, { align: "right" });
    doc.text(`Hiệu lực đến: ${formatQuoteDate(data.validUntil)}`);
    doc.text(`Loại tiền: ${data.currency}   Loại giá: ${quotePriceVatTypeLabel(data.priceVatType)}`);
    doc.moveDown(0.5);

    const colW = 42;
    const startY = doc.y;
    doc.font(DEJAVU_BOLD, 8).text("Thông tin khách hàng", 28, startY);
    doc.font(DEJAVU_FONT, 7);
    let y = startY + 12;
    const leftFields = [
      ["Đơn vị", data.customerCompany],
      ["MST", data.customerTaxCode],
      ["Địa chỉ", data.customerAddress],
      ["Liên hệ", data.customerContactName],
      ["Chức vụ", data.customerContactTitle],
      ["ĐT", data.customerPhone],
      ["Email", data.customerEmail],
    ];
    for (const [label, val] of leftFields) {
      if (val) {
        doc.text(`${label}: ${val}`, 28, y, { width: 360 });
        y += 10;
      }
    }

    doc.font(DEJAVU_BOLD, 8).text("Nhân viên tư vấn", 400, startY);
    doc.font(DEJAVU_FONT, 7);
    let sy = startY + 12;
    const salesFields = [
      ["Tên", data.salesName],
      ["ĐT", data.salesPhone],
      ["Email", data.salesEmail],
      ["Địa chỉ", data.salesAddress],
    ];
    for (const [label, val] of salesFields) {
      if (val) {
        doc.text(`${label}: ${val}`, 400, sy, { width: 360 });
        sy += 10;
      }
    }

    doc.moveDown(2);
    let tableY = Math.max(y, sy) + 16;

    const headers = ["STT", "Thiết kế", "Màu", "Danh mục", "Giới tính", "Sản phẩm", "SKU", "Mô tả", "MOQ", "Ghi chú", "SL", "ĐV", "Loại giá", "Đơn giá", "Tổng"];
    if (data.showProductionLeadTime) headers.push("TG SX");
    if (data.showSampleFee) headers.push("Phí mẫu");
    if (data.showSampleLeadTime) headers.push("TG mẫu");

    const pageW = doc.page.width - 56;
    const colCount = headers.length;
    const baseW = pageW / colCount;
    const rowH = 22;
    let x = 28;

    headers.forEach((h) => {
      drawCell(doc, h, x, tableY, baseW, rowH, { bold: true, fontSize: 6, align: "center" });
      x += baseW;
    });

    tableY += rowH;
    data.items.forEach((item, idx) => {
      x = 28;
      const priceType = formatQuotePriceTypeLabel(data.priceVatType);
      const cells = [
        String(idx + 1),
        item.designImageUrl ? "Có" : "—",
        item.colorSnapshot ?? "—",
        item.categorySnapshot ?? "—",
        item.genderSnapshot ?? "—",
        [item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "—",
        item.skuSnapshot ?? "—",
        item.description ?? "—",
        formatQuoteMoq(item.moqSnapshot),
        item.itemNote ?? "—",
        String(item.quantity),
        item.unit,
        priceType,
        formatQuoteMoney(item.unitPrice, data.currency),
        formatQuoteMoney(item.lineTotal, data.currency),
      ];
      if (data.showProductionLeadTime) cells.push(item.productionLeadTime ?? "—");
      if (data.showSampleFee) cells.push(item.sampleFee != null ? formatQuoteMoney(item.sampleFee, data.currency) : "—");
      if (data.showSampleLeadTime) cells.push(item.sampleLeadTime ?? "—");

      cells.forEach((cell) => {
        drawCell(doc, cell, x, tableY, baseW, rowH, { fontSize: 6 });
        x += baseW;
      });
      tableY += rowH;
    });

    tableY += 8;
    doc.font(DEJAVU_FONT, 9);
    const displayTotal = data.manualOverride && data.manualTotalAmount != null ? data.manualTotalAmount : data.totalAmount;
    doc.text(`Tổng cộng: ${formatQuoteMoney(displayTotal, data.currency)}`, 28, tableY, { align: "right", width: pageW });

    if (data.customerNote) {
      tableY += 20;
      doc.font(DEJAVU_BOLD, 9).text("Ghi chú gửi khách:", 28, tableY);
      doc.font(DEJAVU_FONT, 8).text(data.customerNote, 28, tableY + 12, { width: pageW });
    }

    if (data.terms) {
      tableY += 40;
      doc.font(DEJAVU_BOLD, 9).text("Điều khoản báo giá:", 28, tableY);
      doc.font(DEJAVU_FONT, 7).text(data.terms, 28, tableY + 12, { width: pageW });
    }

    if (data.preparedBy) {
      doc.font(DEJAVU_FONT, 9).text(`Người lập: ${data.preparedBy}`, 28, doc.page.height - 60, { align: "right", width: pageW });
    }

    doc.end();
  });
}

export function quotePdfFilename(quoteNo: string): string {
  return `bao-gia-${quoteNo.replace(/[^a-zA-Z0-9-]/g, "")}.pdf`;
}
