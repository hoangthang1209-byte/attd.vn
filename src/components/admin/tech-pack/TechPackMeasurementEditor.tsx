"use client";

import { useEffect, useMemo, useState } from "react";

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
  }>) => void;
};

export default function TechPackMeasurementEditor({
  measurements,
  readOnly,
  showBaseSize = true,
  emptyText = "Chưa có điểm đo. Áp dụng mẫu thông số hoặc chọn rập.",
  onSave,
}: Props) {
  const [rows, setRows] = useState<MeasurementRow[]>(() => toRows(measurements));
  const [sizes, setSizes] = useState<string[]>(() => getInitialSizes(measurements));
  const [newSize, setNewSize] = useState("");

  useEffect(() => {
    setRows(toRows(measurements));
    setSizes(getInitialSizes(measurements));
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
    setRows((prev) => [
      ...prev,
      {
        clientKey: `new-${Date.now()}`,
        pointOfMeasure: "",
        description: "",
        baseSize: "",
        tolerance: "",
        values: {},
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

  function addSize() {
    const trimmed = newSize.trim().toUpperCase();
    if (!trimmed || sizes.some((size) => size.toUpperCase() === trimmed)) return;
    setSizes((prev) => sortSizes([...prev, trimmed]));
    setNewSize("");
  }

  function removeSize(size: string) {
    setSizes((prev) => prev.filter((item) => item !== size));
    setRows((prev) =>
      prev.map((row) => {
        const nextValues = { ...row.values };
        delete nextValues[size];
        return { ...row, values: nextValues };
      }),
    );
  }

  const canSave = useMemo(
    () => !readOnly && rows.some((row) => row.pointOfMeasure.trim()),
    [readOnly, rows],
  );

  function commit() {
    onSave(
      rows
        .filter((r) => r.pointOfMeasure.trim())
        .map((r, index) => ({
          pointOfMeasure: r.pointOfMeasure.trim(),
          description: r.description.trim() || null,
          baseSize: r.baseSize.trim() || null,
          tolerance: r.tolerance.trim() || null,
          sortOrder: index,
          values: sizes
            .map((size) => ({ size, value: r.values[size]?.trim() ?? "" }))
            .filter((v) => v.size && v.value),
        })),
    );
  }

  if (rows.length === 0 && readOnly) {
    return <p className="admin-muted">Chưa có điểm đo.</p>;
  }

  return (
    <div className="tech-pack-measurement-editor">
      {!readOnly && (
        <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="admin-btn admin-btn--primary admin-btn--xs" onClick={addRow}>
            Thêm dòng đo
          </button>
          <button type="button" className="admin-btn admin-btn--xs" onClick={addCommonRows}>
            Thêm điểm đo áo
          </button>
          <input
            className="admin-input admin-input--sm"
            style={{ width: 96 }}
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
            Thêm size
          </button>
          <button type="button" className="admin-btn admin-btn--primary admin-btn--xs" disabled={!canSave} onClick={commit}>
            Lưu bảng
          </button>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="admin-muted">{emptyText}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--compact">
            <thead>
              <tr>
                <th>POM</th>
                <th>Mô tả</th>
                {showBaseSize && <th>Base size</th>}
                <th>Tolerance</th>
                {sizes.map((size) => (
                  <th key={size} style={{ minWidth: 92, textAlign: "center" }}>
                    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                      {size}
                      {!readOnly && sizes.length > 1 && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--xs admin-btn--danger"
                          style={{ padding: "1px 6px" }}
                          onClick={() => removeSize(size)}
                          aria-label={`Xóa size ${size}`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  </th>
                ))}
                {!readOnly && <th />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.clientKey}>
                  <td>
                    <input
                      className="admin-input admin-input--sm"
                      value={row.pointOfMeasure}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { pointOfMeasure: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input admin-input--sm"
                      value={row.description}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { description: e.target.value })}
                    />
                  </td>
                  {showBaseSize && (
                    <td>
                      <input
                        className="admin-input admin-input--sm"
                        value={row.baseSize}
                        disabled={readOnly}
                        onChange={(e) => updateRow(row.clientKey, { baseSize: e.target.value })}
                      />
                    </td>
                  )}
                  <td>
                    <input
                      className="admin-input admin-input--sm"
                      value={row.tolerance}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { tolerance: e.target.value })}
                    />
                  </td>
                  {sizes.map((size) => (
                    <td key={size}>
                      <input
                        className="admin-input admin-input--sm"
                        value={row.values[size] ?? ""}
                        disabled={readOnly}
                        inputMode="decimal"
                        onChange={(e) => updateValue(row.clientKey, size, e.target.value)}
                        aria-label={`${row.pointOfMeasure || "Điểm đo"} ${size}`}
                      />
                    </td>
                  ))}
                  {!readOnly && (
                    <td>
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
