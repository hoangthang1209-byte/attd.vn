"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, FolderOpen, Upload, X } from "lucide-react";
import styles from "./PatternLibrary.module.css";
import {
  normalizePatternImportHeader,
  PATTERN_IMPORT_HEADER_ALIASES,
  PATTERN_IMPORT_MAX_ROWS,
  PATTERN_IMPORT_TEMPLATE_HEADERS,
  splitPatternImportFiles,
  type PatternBulkImportResponse,
  type PatternBulkImportRow,
} from "@/features/patterns/pattern-bulk-import";

type Props = {
  onClose: () => void;
  onImported: () => void;
};

type SpreadsheetRecord = Record<string, unknown>;

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
}

function resolveColumn(record: SpreadsheetRecord, aliases: string[]): string {
  const entries = Object.entries(record);
  for (const [key, value] of entries) {
    const normalized = normalizePatternImportHeader(key);
    if (aliases.includes(normalized)) return cellText(value);
  }
  return "";
}

function parseRows(records: SpreadsheetRecord[]): PatternBulkImportRow[] {
  return records
    .map((record, index) => {
      const name = resolveColumn(record, PATTERN_IMPORT_HEADER_ALIASES.name);
      return {
        rowNumber: index + 2,
        name,
        category: resolveColumn(record, PATTERN_IMPORT_HEADER_ALIASES.category),
        product: resolveColumn(record, PATTERN_IMPORT_HEADER_ALIASES.product),
        baseSize: resolveColumn(record, PATTERN_IMPORT_HEADER_ALIASES.baseSize),
        sizeRange: resolveColumn(record, PATTERN_IMPORT_HEADER_ALIASES.sizeRange),
        gradingRule: resolveColumn(record, PATTERN_IMPORT_HEADER_ALIASES.gradingRule),
        sourceType: resolveColumn(record, PATTERN_IMPORT_HEADER_ALIASES.sourceType),
        supplier: resolveColumn(record, PATTERN_IMPORT_HEADER_ALIASES.supplier),
        customer: resolveColumn(record, PATTERN_IMPORT_HEADER_ALIASES.customer),
        sourceNotes: resolveColumn(record, PATTERN_IMPORT_HEADER_ALIASES.sourceNotes),
        notes: resolveColumn(record, PATTERN_IMPORT_HEADER_ALIASES.notes),
        files: splitPatternImportFiles(
          resolveColumn(record, PATTERN_IMPORT_HEADER_ALIASES.files),
        ),
      };
    })
    .filter((row) =>
      [
        row.name,
        row.category,
        row.product,
        row.baseSize,
        row.sizeRange,
        row.gradingRule,
        row.sourceType,
        row.supplier,
        row.customer,
        row.sourceNotes,
        row.notes,
        ...row.files,
      ].some(Boolean),
    )
    .slice(0, PATTERN_IMPORT_MAX_ROWS);
}

function baseName(path: string): string {
  return path.split(/[\\\\/]/).at(-1)?.trim() ?? path.trim();
}

function downloadTemplate() {
  const example = {
    "Tên rập": "Áo thun regular ATTD",
    "Danh mục": "Áo Thun Regular Cao Cấp",
    "Sản phẩm": "",
    "Base size": "L",
    "Dải size": "S-3XL",
    "Quy tắc nhảy size": "",
    "Nguồn": "Nội bộ",
    "Nhà cung cấp": "",
    "Khách hàng": "",
    "Ghi chú nguồn": "",
    "Ghi chú": "Rập cũ nhập từ máy tính",
    File: "ATTD-Regular-L.dxf;ATTD-Regular-spec.pdf",
  };
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet([example], {
    header: [...PATTERN_IMPORT_TEMPLATE_HEADERS],
  });
  worksheet["!cols"] = PATTERN_IMPORT_TEMPLATE_HEADERS.map((header) => ({
    wch: Math.max(14, header.length + 4),
  }));
  XLSX.utils.book_append_sheet(workbook, worksheet, "Nhap rap");
  XLSX.writeFile(workbook, "mau-nhap-rap-attd.xlsx");
}

export default function PatternBulkImportDialog({ onClose, onImported }: Props) {
  const spreadsheetInputRef = useRef<HTMLInputElement | null>(null);
  const localFilesInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceFileName, setSourceFileName] = useState("");
  const [rows, setRows] = useState<PatternBulkImportRow[]>([]);
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<PatternBulkImportResponse | null>(null);

  const invalidRows = useMemo(
    () => rows.filter((row) => !row.name.trim()).length,
    [rows],
  );

  const selectedFileMap = useMemo(() => {
    const map = new Map<string, File[]>();
    for (const file of localFiles) {
      const keys = new Set([
        file.name.trim().toLocaleLowerCase("vi-VN"),
        baseName((file as File & { webkitRelativePath?: string }).webkitRelativePath ?? "")
          .toLocaleLowerCase("vi-VN"),
      ]);
      for (const key of keys) {
        if (!key) continue;
        const current = map.get(key) ?? [];
        current.push(file);
        map.set(key, current);
      }
    }
    return map;
  }, [localFiles]);

  async function handleSpreadsheet(file: File) {
    setError(null);
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("File không có sheet dữ liệu.");
      const sheet = workbook.Sheets[sheetName];
      const records = XLSX.utils.sheet_to_json<SpreadsheetRecord>(sheet, { defval: "" });
      const parsed = parseRows(records);
      if (!parsed.length) {
        throw new Error("Không tìm thấy dòng dữ liệu rập trong file.");
      }
      setRows(parsed);
      setSourceFileName(file.name);
      if (records.length > PATTERN_IMPORT_MAX_ROWS) {
        setError(`Chỉ lấy ${PATTERN_IMPORT_MAX_ROWS} dòng đầu tiên trong lần nhập này.`);
      }
    } catch (err) {
      setRows([]);
      setSourceFileName("");
      setError(err instanceof Error ? err.message : "Không đọc được file.");
    }
  }

  async function uploadMatchedFiles(
    importResult: PatternBulkImportResponse,
  ): Promise<PatternBulkImportResponse> {
    if (!localFiles.length) return importResult;

    const rowByNumber = new Map(rows.map((row) => [row.rowNumber, row]));
    const nextItems = [];

    for (const item of importResult.items) {
      if (item.status !== "created" || !item.id) {
        nextItems.push(item);
        continue;
      }

      const row = rowByNumber.get(item.rowNumber);
      if (!row?.files.length) {
        nextItems.push(item);
        continue;
      }

      const warnings = [...(item.warnings ?? [])];
      for (const requestedName of row.files) {
        const key = baseName(requestedName).toLocaleLowerCase("vi-VN");
        const matched = selectedFileMap.get(key)?.[0];
        if (!matched) {
          warnings.push(`Chưa chọn file "${requestedName}" từ máy tính.`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", matched);
        formData.append("type", "OTHER");
        const response = await fetch(`/api/patterns/${item.id}/files`, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { message?: string };
          warnings.push(
            `Không tải được "${matched.name}": ${body.message ?? "lỗi tải file"}.`,
          );
        }
      }

      nextItems.push({
        ...item,
        warnings: warnings.length ? warnings : undefined,
      });
    }

    return { ...importResult, items: nextItems };
  }

  async function runImport() {
    if (!rows.length || invalidRows > 0 || importing) return;
    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/patterns/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const body = (await response.json()) as PatternBulkImportResponse & { message?: string };
      if (!response.ok && !body.items) {
        throw new Error(body.message ?? "Không thể nhập dữ liệu rập.");
      }

      const withFiles = await uploadMatchedFiles(body);
      setResult(withFiles);
      if (withFiles.created > 0) onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể nhập dữ liệu rập.");
    } finally {
      setImporting(false);
    }
  }

  const previewRows = rows.slice(0, 25);

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="pattern-import-title">
        <header className={styles.modalHeader}>
          <div>
            <h2 id="pattern-import-title" className={styles.modalTitle}>
              Nhập rập hàng loạt
            </h2>
            <p className={styles.modalDescription}>
              Nhập dữ liệu rập cũ từ Excel/CSV và gắn các file DXF, PLT, AI, PDF, ZIP hoặc ảnh từ máy tính.
            </p>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Đóng">
            <X size={17} />
          </button>
        </header>

        <div className={styles.modalBody}>
          <div className={styles.importGrid}>
            <div className={styles.dropCard}>
              <FileSpreadsheet size={22} />
              <h3 className={styles.dropCardTitle}>1. Chọn file dữ liệu</h3>
              <p className={styles.dropCardText}>
                Dùng file Excel hoặc CSV. Cột duy nhất bắt buộc là <strong>Tên rập</strong>.
              </p>
              <div>
                <button
                  type="button"
                  className="admin-btn admin-btn--sm"
                  onClick={() => spreadsheetInputRef.current?.click()}
                >
                  <Upload size={14} />
                  &nbsp;Chọn Excel / CSV
                </button>{" "}
                <button type="button" className="admin-btn admin-btn--sm" onClick={downloadTemplate}>
                  Tải file mẫu
                </button>
              </div>
              <input
                ref={spreadsheetInputRef}
                className={styles.hiddenInput}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleSpreadsheet(file);
                  event.currentTarget.value = "";
                }}
              />
              <div className={styles.fileMeta}>
                {sourceFileName ? `${sourceFileName} · ${rows.length} dòng` : "Chưa chọn file dữ liệu"}
              </div>
            </div>

            <div className={styles.dropCard}>
              <FolderOpen size={22} />
              <h3 className={styles.dropCardTitle}>2. Chọn file rập từ máy tính</h3>
              <p className={styles.dropCardText}>
                Không bắt buộc. Chọn nhiều file cùng lúc; hệ thống ghép theo tên ở cột <strong>File</strong>.
                Nhiều file cho một rập ngăn bằng dấu <strong>;</strong>.
              </p>
              <div>
                <button
                  type="button"
                  className="admin-btn admin-btn--sm"
                  onClick={() => localFilesInputRef.current?.click()}
                >
                  <FolderOpen size={14} />
                  &nbsp;Chọn nhiều file
                </button>
              </div>
              <input
                ref={localFilesInputRef}
                className={styles.hiddenInput}
                type="file"
                multiple
                accept=".dxf,.plt,.ai,.pdf,.zip,.jpg,.jpeg,.png,.webp"
                onChange={(event) => {
                  setLocalFiles(Array.from(event.target.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
              <div className={styles.fileMeta}>
                {localFiles.length ? `Đã chọn ${localFiles.length} file` : "Có thể bỏ qua và bổ sung file sau"}
              </div>
            </div>
          </div>

          <p className={styles.importHint}>
            Danh mục, sản phẩm, khách hàng và nhà cung cấp sẽ được tự dò theo tên hoặc mã hiện có trong CMS.
            Nếu không tìm thấy, rập vẫn được tạo và hệ thống báo cảnh báo để bạn bổ sung sau.
          </p>

          {error && <p className="admin-error">{error}</p>}

          {rows.length > 0 && (
            <>
              <div className={styles.previewHeader}>
                <h3 className={styles.previewTitle}>Kiểm tra trước khi nhập</h3>
                <span className={styles.previewMeta}>
                  {rows.length} rập · {localFiles.length} file đã chọn
                  {rows.length > previewRows.length ? ` · đang xem ${previewRows.length} dòng đầu` : ""}
                </span>
              </div>
              <div className={styles.previewWrap}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>Dòng</th>
                      <th>Tên rập</th>
                      <th>Danh mục / sản phẩm</th>
                      <th>Size</th>
                      <th>Nguồn</th>
                      <th>Khách / NCC</th>
                      <th>File</th>
                      <th>Kiểm tra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td>{row.rowNumber}</td>
                        <td>{row.name || "—"}</td>
                        <td>
                          {row.category || "—"}
                          {row.product ? <div>{row.product}</div> : null}
                        </td>
                        <td>
                          {row.baseSize || "—"}
                          {row.sizeRange ? <div>{row.sizeRange}</div> : null}
                        </td>
                        <td>{row.sourceType || "—"}</td>
                        <td>
                          {row.customer || "—"}
                          {row.supplier ? <div>{row.supplier}</div> : null}
                        </td>
                        <td>{row.files.length ? row.files.join("; ") : "—"}</td>
                        <td className={row.name ? styles.previewOk : styles.previewError}>
                          {row.name ? "Sẵn sàng" : "Thiếu tên rập"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {result && (
            <div className={styles.resultBox}>
              <div className={styles.resultSummary}>
                <strong>Đã tạo: {result.created}</strong>
                <span>Lỗi: {result.failed}</span>
                <span>
                  Cảnh báo: {result.items.reduce((sum, item) => sum + (item.warnings?.length ?? 0), 0)}
                </span>
              </div>
              <ul className={styles.resultList}>
                {result.items.map((item) => (
                  <li key={`${item.rowNumber}-${item.code ?? item.name}`}>
                    Dòng {item.rowNumber}:{" "}
                    {item.status === "created"
                      ? `${item.code ?? ""} ${item.name}`.trim()
                      : `${item.name || "(không tên)"} — ${item.message ?? "Lỗi"}`}
                    {item.warnings?.length ? ` — ${item.warnings.join(" ")}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className={styles.modalFooter}>
          <span className={styles.footerHint}>
            Tối đa {PATTERN_IMPORT_MAX_ROWS} rập mỗi lần nhập. Không ghi đè rập hiện có.
          </span>
          <div className={styles.footerActions}>
            <button type="button" className="admin-btn" onClick={onClose} disabled={importing}>
              {result ? "Đóng" : "Hủy"}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => void runImport()}
              disabled={!rows.length || invalidRows > 0 || importing}
            >
              {importing ? "Đang nhập..." : `Nhập ${rows.length || ""} rập`}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
