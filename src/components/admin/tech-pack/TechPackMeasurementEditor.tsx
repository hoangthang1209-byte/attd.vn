"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ClipboardEvent } from "react";

export type MeasurementRow = {
  clientKey: string;
  pointOfMeasure: string;
  description: string;
  baseSize: string;
  tolerance: string;
  values: Record<string, string>;
};

type ServerMeasurement = {
  id: string;
  pointOfMeasure: string;
  description: string | null;
  baseSize: string | null;
  tolerance: string | null;
  values: Array<{ size: string; value: string }>;
};

const DEFAULT_SIZE_COLUMNS = ["S", "M", "L", "XL", "2XL"];
const COMMON_POINTS_OF_MEASURE = ["Dài áo", "Ngang ngực", "Vai", "Tay", "Cổ"];

function sizeRank(size: string): number {
  const normalized = size.trim().toUpperCase();
  const known = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  const index = known.indexOf(normalized);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const rankDiff = sizeRank(a) - sizeRank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" });
  });
}

function toRows(items: ServerMeasurement[]): MeasurementRow[] {
  return items.map((m) => ({
    clientKey: m.id,
    pointOfMeasure: m.pointOfMeasure,
    description: m.description ?? "",
    baseSize: m.baseSize ?? "",
    tolerance: m.tolerance ?? "",
    values: Object.fromEntries(m.values.map((v) => [v.size, v.value])),
  }));
}

function getInitialSizes(items: ServerMeasurement[]): string[] {
  const fromValues = sortSizes(
    Array.from(new Set(items.flatMap((m) => m.values.map((v) => v.size.trim()).filter(Boolean)))),
  );
  return fromValues.length > 0 ? fromValues : DEFAULT_SIZE_COLUMNS;
}

type Props = {
  measurements: ServerMeasurement[];
  readOnly?: boolean;
  showBaseSize?: boolean;
  emptyText?: string;
  onSave: (rows: Array<{
    pointOfMeasure: string;
    description: string | null;
    baseSize: string | null;
    tolerance: string | null;
    sortOrder?: number;
    values: Array<{ size: string; value: string }>;
  }>) => void | Promise<void>;
  saving?: boolean;
  fieldErrors?: Record<string, string>;
  errorDetail?: { code?: string; traceId?: string; message?: string } | null;
  showSaveButton?: boolean;
  compactToolbar?: boolean;
  onDraftChange?: (rows: Array<{
    pointOfMeasure: string;
    description: string | null;
    baseSize: string | null;
    tolerance: string | null;
    sortOrder?: number;
    values: Array<{ size: string; value: string }>;
  }>) => void;
};

export default function TechPackMeasurementEditor({
  measurements,
  readOnly,
  showBaseSize = true,
  emptyText = "Chưa có thông số đo. Thêm điểm đo hoặc áp dụng mẫu thông số.",
  onSave,
  saving,
  fieldErrors,
  errorDetail,
  showSaveButton = true,
  compactToolbar = false,
  onDraftChange,
}: Props) {
  const [rows, setRows] = useState<MeasurementRow[]>(() => toRows(measurements));
  const [sizes, setSizes] = useState<string[]>(() => getInitialSizes(measurements));
  const [sizeDrafts, setSizeDrafts] = useState<Record<string, string>>({});
  const [newSize, setNewSize] = useState("");
  const [sizeError, setSizeError] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);

  useEffect(() => {
    setRows(toRows(measurements));
    setSizes(getInitialSizes(measurements));
    setSizeDrafts({});
  }, [measurements]);

  function updateRow(key: string, patch: Partial<MeasurementRow>) {
    setRows((prev) => prev.map((r) => (r.clientKey === key ? { ...r, ...patch } : r)));
  }

  function updateValue(key: string, size: string, value: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.clientKey === key
          ? { ...row, values: { ...row.values, [size]: value } }
          : row,
      ),
    );
  }

  function addRow() {
    const values = Object.fromEntries(sizes.map((size) => [size, ""]));
    setRows((prev) => [
      ...prev,
      {
        clientKey: `new-${Date.now()}`,
        pointOfMeasure: "",
        description: "",
        baseSize: "",
        tolerance: "",
        values,
      },
    ]);
  }

  function addCommonRows() {
    setRows((prev) => {
      const existing = new Set(prev.map((row) => row.pointOfMeasure.trim().toLowerCase()).filter(Boolean));
      const additions = COMMON_POINTS_OF_MEASURE
        .filter((pom) => !existing.has(pom.toLowerCase()))
        .map((pom, index) => ({
          clientKey: `preset-${Date.now()}-${index}`,
          pointOfMeasure: pom,
          description: "",
          baseSize: "",
          tolerance: "",
          values: {},
        }));
      return [...prev, ...additions];
    });
  }

  function deleteRow(key: string) {
    setRows((prev) => prev.filter((r) => r.clientKey !== key));
  }

  function normalizeSizeLabel(value: string) {
    return value.trim().toUpperCase();
  }

  function addSize() {
    const trimmed = normalizeSizeLabel(newSize);
    setSizeError(null);
    if (!trimmed) return;
    if (sizes.some((size) => size.toUpperCase() === trimmed)) {
      setSizeError("Size này đã tồn tại.");
      return;
    }
    setSizes((prev) => sortSizes([...prev, trimmed]));
    setRows((prev) => prev.map((row) => ({ ...row, values: { ...row.values, [trimmed]: "" } })));
    setSizeDrafts((prev) => {
      const next = { ...prev };
      delete next[trimmed];
      return next;
    });
    setNewSize("");
  }

  function renameSize(oldSize: string, nextValue: string) {
    const nextSize = normalizeSizeLabel(nextValue);
    setSizeError(null);
    if (!nextSize || nextSize === oldSize) return;
    if (sizes.some((size) => size !== oldSize && size.toUpperCase() === nextSize)) {
      setSizeError("Size này đã tồn tại.");
      return;
    }
    setSizes((prev) => sortSizes(prev.map((size) => (size === oldSize ? nextSize : size))));
    setSizeDrafts((prev) => {
      const next = { ...prev };
      delete next[oldSize];
      delete next[nextSize];
      return next;
    });
    setRows((prev) =>
      prev.map((row) => {
        const nextValues = { ...row.values, [nextSize]: row.values[oldSize] ?? "" };
        delete nextValues[oldSize];
        return { ...row, values: nextValues };
      }),
    );
  }

  function removeSize(size: string) {
    setSizes((prev) => prev.filter((item) => item !== size));
    setSizeDrafts((prev) => {
      const next = { ...prev };
      delete next[size];
      return next;
    });
    setRows((prev) =>
      prev.map((row) => {
        const nextValues = { ...row.values };
        delete nextValues[size];
        return { ...row, values: nextValues };
      }),
    );
  }

  const canSave = useMemo(
    () => !readOnly && !saving && rows.some((row) => row.pointOfMeasure.trim()),
    [readOnly, rows, saving],
  );

  function resolveRowsForSave() {
    const resolvedSizes = sizes.map((size) => normalizeSizeLabel(sizeDrafts[size] ?? size));
    const seenResolvedSizes = new Set<string>();
    if (
      resolvedSizes.some((size) => {
        if (!size || seenResolvedSizes.has(size)) return true;
        seenResolvedSizes.add(size);
        return false;
      })
    ) {
      setSizeError("Size này đã tồn tại hoặc không hợp lệ.");
      return null;
    }

    setSizeError(null);
    return rows
      .filter((r) => r.pointOfMeasure.trim())
      .map((r, index) => ({
        pointOfMeasure: r.pointOfMeasure.trim(),
        description: r.description.trim() || null,
        baseSize: r.baseSize.trim() || null,
        tolerance: r.tolerance.trim() || null,
        sortOrder: index,
        values: sizes
          .map((size, sizeIndex) => ({ size: resolvedSizes[sizeIndex], value: r.values[size]?.trim() ?? "" }))
          .filter((v) => v.size && v.value),
      }));
  }

  useEffect(() => {
    const nextRows = resolveRowsForSave();
    if (nextRows) onDraftChange?.(nextRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sizes, sizeDrafts]);

  function commit() {
    const nextRows = resolveRowsForSave();
    if (nextRows) void onSave(nextRows);
  }

  function moveFocus(current: HTMLInputElement, rowDelta: number, colDelta: number) {
    const table = tableRef.current;
    if (!table) return;
    const currentCell = current.closest("td, th");
    const currentRow = current.closest("tr");
    if (!currentCell || !currentRow) return;

    const cells = Array.from(currentRow.children);
    const colIndex = cells.indexOf(currentCell);
    const tableRows = Array.from(table.querySelectorAll("tr"));
    const rowIndex = tableRows.indexOf(currentRow);
    const targetRow = tableRows[rowIndex + rowDelta] ?? currentRow;
    const targetCell = targetRow.children[colIndex + colDelta] ?? targetRow.children[colIndex];
    const targetInput = targetCell?.querySelector<HTMLInputElement>("input");
    targetInput?.focus();
    targetInput?.select();
  }

  function handleCellKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      moveFocus(e.currentTarget, 1, 0);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(e.currentTarget, 1, 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(e.currentTarget, -1, 0);
    } else if (e.key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      moveFocus(e.currentTarget, 0, 1);
    } else if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) {
      moveFocus(e.currentTarget, 0, -1);
    }
  }

  function parseClipboardRows(text: string) {
    return text
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split("\t").map((cell) => cell.trim()));
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;
    e.preventDefault();

    const grid = parseClipboardRows(text);
    if (grid.length === 0) return;

    const header = grid[0].map((cell) => cell.toLowerCase());
    const hasHeader = header.some((cell) => ["pom", "mô tả", "mo ta", "base size", "tolerance"].includes(cell));
    const sourceRows = hasHeader ? grid.slice(1) : grid;
    const headerSizes = hasHeader
      ? grid[0]
          .slice(3)
          .map(normalizeSizeLabel)
          .filter(Boolean)
      : [];
    const nextSizes = headerSizes.length > 0 ? sortSizes(Array.from(new Set([...sizes, ...headerSizes]))) : sizes;

    setSizes(nextSizes);
    setRows((prev) => {
      const pastedRows = sourceRows
        .filter((row) => row.some(Boolean))
        .map((row, index) => {
          const pastedSizes = headerSizes.length > 0 ? headerSizes : nextSizes.slice(0, Math.max(row.length - 4, 0));
          const values: Record<string, string> = {};
          pastedSizes.forEach((size, sizeIndex) => {
            const value = row[(hasHeader ? 3 : 4) + sizeIndex] ?? "";
            if (value) values[size] = value;
          });
          return {
            clientKey: `paste-${Date.now()}-${index}`,
            pointOfMeasure: row[0] ?? "",
            description: row[1] ?? "",
            baseSize: hasHeader ? "" : row[2] ?? "",
            tolerance: hasHeader ? row[2] ?? "" : row[3] ?? "",
            values,
          };
        });
      return [...prev, ...pastedRows];
    });
  }

  function clearTable() {
    if (!window.confirm("Xóa toàn bộ bảng thông số trên màn hình? Thay đổi chỉ được lưu khi bấm Lưu ở header.")) {
      return;
    }
    setRows([]);
    setSizes(DEFAULT_SIZE_COLUMNS);
    setSizeDrafts({});
    setSizeError(null);
  }

  async function copyTable() {
    const resolvedSizes = sizes.map((size) => normalizeSizeLabel(sizeDrafts[size] ?? size));
    const header = [
      "POM",
      "Mô tả",
      ...(showBaseSize ? ["Base size"] : []),
      "Tolerance",
      ...resolvedSizes,
    ];
    const lines = [header.join("\t")];
    for (const row of rows) {
      if (!row.pointOfMeasure.trim() && !row.description.trim()) continue;
      lines.push(
        [
          row.pointOfMeasure,
          row.description,
          ...(showBaseSize ? [row.baseSize] : []),
          row.tolerance,
          ...resolvedSizes.map((size) => row.values[size] ?? ""),
        ].join("\t"),
      );
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {
      setSizeError("Không thể copy bảng.");
    }
  }

  if (rows.length === 0 && readOnly) {
    return <p className="admin-muted">Chưa có điểm đo.</p>;
  }

  return (
    <div className="tech-pack-measurement-editor">
      {!readOnly && (
        <div className="tech-pack-measurement-toolbar">
          <button type="button" className="admin-btn admin-btn--primary admin-btn--xs" onClick={addRow}>
            {compactToolbar ? "+ Điểm đo" : "Thêm điểm đo"}
          </button>
          {!compactToolbar && (
            <button type="button" className="admin-btn admin-btn--xs" onClick={addCommonRows}>
              Thêm điểm đo áo
            </button>
          )}
          <input
            className="admin-input admin-input--sm"
            style={{ width: compactToolbar ? 72 : 96 }}
            value={newSize}
            placeholder="Size"
            onChange={(e) => setNewSize(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSize();
              }
            }}
          />
          <button type="button" className="admin-btn admin-btn--xs" onClick={addSize}>
            {compactToolbar ? "+ Size" : "Thêm size"}
          </button>
          <button type="button" className="admin-btn admin-btn--xs" onClick={() => void copyTable()}>
            {compactToolbar ? "Copy" : "Copy bảng"}
          </button>
          <button type="button" className="admin-btn admin-btn--xs" onClick={clearTable}>
            {compactToolbar ? "Clear" : "Xóa bảng"}
          </button>
          <span className="admin-muted tech-pack-measurement-toolbar__hint">
            {compactToolbar ? "Paste Excel" : "Dán từ Excel vào ô bất kỳ"}
          </span>
          {showSaveButton && (
            <button type="button" className="admin-btn admin-btn--primary admin-btn--xs" disabled={!canSave} onClick={commit}>
              {saving ? "Đang lưu bảng đo…" : "Lưu bảng"}
            </button>
          )}
          {sizeError && <span className="admin-error tech-pack-measurement-toolbar__error">{sizeError}</span>}
        </div>
      )}
      {errorDetail && (errorDetail.message || errorDetail.code || errorDetail.traceId) && (
        <details className="admin-error" style={{ marginBottom: 12, fontSize: 12 }} open>
          <summary>{errorDetail.message ?? "Không thể lưu bảng đo. Vui lòng kiểm tra dữ liệu và thử lại."}</summary>
          <div style={{ marginTop: 4 }}>
            Chi tiết lỗi:{" "}
            {errorDetail.code && <>Mã lỗi: {errorDetail.code}</>}
            {errorDetail.code && errorDetail.traceId && " · "}
            {errorDetail.traceId && <>Mã tra cứu: {errorDetail.traceId}</>}
          </div>
        </details>
      )}
      {fieldErrors && Object.keys(fieldErrors).length > 0 && (
        <div className="admin-error" style={{ marginBottom: 12 }}>
          {Object.entries(fieldErrors).map(([field, message]) => (
            <div key={field}>{message}</div>
          ))}
        </div>
      )}
      {rows.length === 0 ? (
        <p className="admin-muted">{emptyText}</p>
      ) : (
        <div className="admin-table-wrap tech-pack-measurement-table-wrap">
          <table ref={tableRef} className="admin-table admin-table--compact tech-pack-measurement-table">
            <thead>
              <tr>
                <th className="pattern-measure-col-pom">POM</th>
                <th className="pattern-measure-col-desc">Mô tả</th>
                {showBaseSize && <th className="pattern-measure-col-base">Base size</th>}
                <th className="pattern-measure-col-tol">Tolerance</th>
                {sizes.map((size) => (
                  <th key={size} className="pattern-measure-col-size">
                    <span className="pattern-measure-col-size__head">
                      {readOnly ? (
                        size
                      ) : (
                        <input
                          className="admin-input admin-input--sm pattern-measure-size-label-input"
                          value={sizeDrafts[size] ?? size}
                          aria-label={`Sửa size ${size}`}
                          onChange={(e) =>
                            setSizeDrafts((prev) => ({ ...prev, [size]: e.target.value }))
                          }
                          onBlur={(e) => renameSize(size, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      )}
                      {!readOnly && sizes.length > 1 && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--xs admin-btn--danger pattern-measure-col-size__remove"
                          onClick={() => removeSize(size)}
                          aria-label={`Xóa size ${size}`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  </th>
                ))}
                {!readOnly && <th className="pattern-measure-col-actions" aria-label="Thao tác" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.clientKey}>
                  <td className="pattern-measure-col-pom">
                    <input
                      className="admin-input admin-input--sm pattern-measure-input pattern-measure-input--text"
                      value={row.pointOfMeasure}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { pointOfMeasure: e.target.value })}
                      onKeyDown={handleCellKeyDown}
                      onPaste={handlePaste}
                    />
                  </td>
                  <td className="pattern-measure-col-desc">
                    <input
                      className="admin-input admin-input--sm pattern-measure-input pattern-measure-input--text"
                      value={row.description}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { description: e.target.value })}
                      onKeyDown={handleCellKeyDown}
                      onPaste={handlePaste}
                    />
                  </td>
                  {showBaseSize && (
                    <td className="pattern-measure-col-base">
                      <input
                        className="admin-input admin-input--sm pattern-measure-input pattern-measure-input--meta"
                        value={row.baseSize}
                        disabled={readOnly}
                        onChange={(e) => updateRow(row.clientKey, { baseSize: e.target.value })}
                        onKeyDown={handleCellKeyDown}
                        onPaste={handlePaste}
                      />
                    </td>
                  )}
                  <td className="pattern-measure-col-tol">
                    <input
                      className="admin-input admin-input--sm pattern-measure-input pattern-measure-input--meta"
                      value={row.tolerance}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { tolerance: e.target.value })}
                      onKeyDown={handleCellKeyDown}
                      onPaste={handlePaste}
                    />
                  </td>
                  {sizes.map((size) => (
                    <td key={size} className="pattern-measure-col-size">
                      <input
                        className="admin-input admin-input--sm pattern-measure-input pattern-measure-input--size"
                        value={row.values[size] ?? ""}
                        disabled={readOnly}
                        inputMode="decimal"
                        onChange={(e) => updateValue(row.clientKey, size, e.target.value)}
                        onKeyDown={handleCellKeyDown}
                        onPaste={handlePaste}
                        aria-label={`${row.pointOfMeasure || "Điểm đo"} ${size}`}
                      />
                    </td>
                  ))}
                  {!readOnly && (
                    <td className="pattern-measure-col-actions">
                      <button type="button" className="admin-btn admin-btn--xs admin-btn--danger" onClick={() => deleteRow(row.clientKey)}>
                        Xóa
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
