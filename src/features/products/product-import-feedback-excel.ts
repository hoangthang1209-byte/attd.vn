import "server-only";
import ExcelJS from "exceljs";
import type { ProductImportPreviewRow } from "@/features/products/product-import-types";
import {
  FEEDBACK_PRODUCT_COLUMNS,
  FEEDBACK_SYSTEM_COLUMNS,
  collectRowFeedbackIssues,
  getProductFieldValue,
  type FeedbackJobMeta,
} from "@/features/products/product-import-feedback";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F2937" },
};

const ERROR_CELL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFC7CE" },
};

const WARNING_CELL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFEB9C" },
};

const ERROR_ROW_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFDECEA" },
};

const WARNING_ROW_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFBE6" },
};

const SYSTEM_COL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE8EEF7" },
};

const INSTRUCTIONS = [
  "Các ô màu đỏ là lỗi bắt buộc cần sửa.",
  "Các ô màu vàng là cảnh báo nên kiểm tra.",
  "Sau khi sửa xong, lưu file và upload lại trong trang Nhập sản phẩm.",
  "Không xoá các cột hệ thống nếu muốn giữ thông tin feedback.",
];

function joinUnique(values: string[]): string {
  return [...new Set(values.filter(Boolean))].join("\n");
}

function styleHeaderRow(sheet: ExcelJS.Worksheet, colCount: number) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.alignment = { vertical: "middle", wrapText: true };
  for (let col = 1; col <= colCount; col++) {
    const cell = headerRow.getCell(col);
    cell.fill = HEADER_FILL;
    cell.border = {
      top: { style: "thin", color: { argb: "FFD1D5DB" } },
      left: { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      right: { style: "thin", color: { argb: "FFD1D5DB" } },
    };
  }
  headerRow.height = 22;
}

function applySystemColumnStyle(sheet: ExcelJS.Worksheet, rowNumber: number, systemColCount: number) {
  for (let col = 1; col <= systemColCount; col++) {
    sheet.getRow(rowNumber).getCell(col).fill = SYSTEM_COL_FILL;
  }
}

export async function generateProductImportFeedbackExcel(
  rows: ProductImportPreviewRow[],
  meta: FeedbackJobMeta,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ATTD CMS";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Tổng quan");
  summarySheet.columns = [
    { header: "Mục", key: "label", width: 28 },
    { header: "Giá trị", key: "value", width: 60 },
  ];

  const summaryRows = [
    { label: "Tên file", value: meta.fileName },
    { label: "Ngày tải lên", value: meta.uploadedAt.toLocaleString("vi-VN") },
    { label: "Preset", value: meta.preset ?? "—" },
    { label: "Trạng thái", value: meta.status ?? "—" },
    { label: "Tổng dòng", value: String(meta.totalRows) },
    { label: "Dòng hợp lệ", value: String(meta.validRows) },
    { label: "Dòng lỗi", value: String(meta.invalidRows) },
    { label: "Số lỗi", value: String(meta.errorCount) },
    { label: "Số cảnh báo", value: String(meta.warningCount) },
    { label: "Hướng dẫn", value: INSTRUCTIONS.join("\n") },
  ];

  for (const item of summaryRows) {
    const row = summarySheet.addRow(item);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  }

  const dataSheet = workbook.addWorksheet("Dữ liệu cần sửa");
  const allHeaders = [...FEEDBACK_SYSTEM_COLUMNS, ...FEEDBACK_PRODUCT_COLUMNS];
  dataSheet.addRow(allHeaders);
  styleHeaderRow(dataSheet, allHeaders.length);

  const systemColCount = FEEDBACK_SYSTEM_COLUMNS.length;
  const fieldColIndex = new Map<string, number>();
  FEEDBACK_PRODUCT_COLUMNS.forEach((field, index) => {
    fieldColIndex.set(field, systemColCount + index + 1);
  });

  for (const row of rows) {
    const issues = collectRowFeedbackIssues(row);
    const errorIssues = issues.filter((i) => i.severity === "error");
    const warningIssues = issues.filter((i) => i.severity === "warning");

    const errorFields = errorIssues.map((i) => i.field);
    const warningFields = warningIssues.map((i) => i.field);
    const errorMessages = joinUnique(errorIssues.map((i) => `${i.field}: ${i.message}`));
    const warningMessages = joinUnique(warningIssues.map((i) => `${i.field}: ${i.message}`));
    const suggestedFix = joinUnique(issues.map((i) => i.suggestedFix ?? ""));

    const rowValues: unknown[] = [
      row.rowIndex + 1,
      row.finalAction,
      errorFields.join(", "),
      errorMessages,
      warningFields.join(", "),
      warningMessages,
      suggestedFix,
      ...FEEDBACK_PRODUCT_COLUMNS.map((field) => getProductFieldValue(row, field)),
    ];

    const excelRow = dataSheet.addRow(rowValues);
    const rowNumber = excelRow.number;

    applySystemColumnStyle(dataSheet, rowNumber, systemColCount);

    const hasErrors = errorIssues.length > 0;
    const hasWarningsOnly = !hasErrors && warningIssues.length > 0;

    if (hasErrors) {
      for (let col = 1; col <= allHeaders.length; col++) {
        excelRow.getCell(col).fill = ERROR_ROW_FILL;
      }
    } else if (hasWarningsOnly) {
      for (let col = 1; col <= allHeaders.length; col++) {
        excelRow.getCell(col).fill = WARNING_ROW_FILL;
      }
    }

    applySystemColumnStyle(dataSheet, rowNumber, systemColCount);

    for (const issue of issues) {
      const colIndex = fieldColIndex.get(issue.field);
      if (!colIndex) continue;
      const cell = excelRow.getCell(colIndex);
      cell.fill = issue.severity === "error" ? ERROR_CELL_FILL : WARNING_CELL_FILL;
      const noteText = issue.suggestedFix
        ? `${issue.message}\nGợi ý: ${issue.suggestedFix}`
        : issue.message;
      cell.note = noteText;
    }

    excelRow.alignment = { vertical: "top", wrapText: true };
  }

  dataSheet.views = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];

  allHeaders.forEach((header, index) => {
    const col = dataSheet.getColumn(index + 1);
    if (header === "errorMessages" || header === "warningMessages" || header === "suggestedFix") {
      col.width = 36;
    } else if (header === "description" || header === "shortDescription") {
      col.width = 24;
    } else {
      col.width = Math.max(14, Math.min(22, header.length + 4));
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
