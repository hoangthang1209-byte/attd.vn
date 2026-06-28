"use client";

import { useEffect, useState } from "react";

export type MeasurementRow = {
  clientKey: string;
  pointOfMeasure: string;
  description: string;
  baseSize: string;
  tolerance: string;
  valuesText: string;
};

type ServerMeasurement = {
  id: string;
  pointOfMeasure: string;
  description: string | null;
  baseSize: string | null;
  tolerance: string | null;
  values: Array<{ size: string; value: string }>;
};

function toRows(items: ServerMeasurement[]): MeasurementRow[] {
  return items.map((m) => ({
    clientKey: m.id,
    pointOfMeasure: m.pointOfMeasure,
    description: m.description ?? "",
    baseSize: m.baseSize ?? "",
    tolerance: m.tolerance ?? "",
    valuesText: m.values.map((v) => `${v.size}:${v.value}`).join(", "),
  }));
}

function parseValues(text: string): Array<{ size: string; value: string }> {
  return text
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [size, ...rest] = part.split(":");
      return { size: size.trim(), value: rest.join(":").trim() };
    })
    .filter((v) => v.size && v.value);
}

type Props = {
  measurements: ServerMeasurement[];
  readOnly?: boolean;
  onSave: (rows: Array<{
    pointOfMeasure: string;
    description: string | null;
    baseSize: string | null;
    tolerance: string | null;
    values: Array<{ size: string; value: string }>;
  }>) => void;
};

export default function TechPackMeasurementEditor({ measurements, readOnly, onSave }: Props) {
  const [rows, setRows] = useState<MeasurementRow[]>(() => toRows(measurements));

  useEffect(() => {
    setRows(toRows(measurements));
  }, [measurements]);

  function updateRow(key: string, patch: Partial<MeasurementRow>) {
    setRows((prev) => prev.map((r) => (r.clientKey === key ? { ...r, ...patch } : r)));
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
        valuesText: "",
      },
    ]);
  }

  function deleteRow(key: string) {
    const next = rows.filter((r) => r.clientKey !== key);
    setRows(next);
    commit(next);
  }

  function commit(nextRows: MeasurementRow[]) {
    onSave(
      nextRows
        .filter((r) => r.pointOfMeasure.trim())
        .map((r, index) => ({
          pointOfMeasure: r.pointOfMeasure.trim(),
          description: r.description.trim() || null,
          baseSize: r.baseSize.trim() || null,
          tolerance: r.tolerance.trim() || null,
          sortOrder: index,
          values: parseValues(r.valuesText),
        })),
    );
  }

  if (rows.length === 0 && readOnly) {
    return <p className="admin-muted">Chưa có điểm đo.</p>;
  }

  return (
    <div className="tech-pack-measurement-editor">
      {!readOnly && (
        <button type="button" className="admin-btn admin-btn--primary admin-btn--xs" style={{ marginBottom: 8 }} onClick={addRow}>
          Thêm điểm đo
        </button>
      )}
      {rows.length === 0 ? (
        <p className="admin-muted">Chưa có điểm đo. Áp dụng mẫu thông số hoặc chọn rập.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--compact">
            <thead>
              <tr>
                <th>Điểm đo</th>
                <th>Mô tả</th>
                <th>Base size</th>
                <th>Tolerance</th>
                <th>Giá trị size (VD: S:50, M:52)</th>
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
                      onBlur={() => commit(rows)}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input admin-input--sm"
                      value={row.description}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { description: e.target.value })}
                      onBlur={() => commit(rows)}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input admin-input--sm"
                      value={row.baseSize}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { baseSize: e.target.value })}
                      onBlur={() => commit(rows)}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input admin-input--sm"
                      value={row.tolerance}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { tolerance: e.target.value })}
                      onBlur={() => commit(rows)}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input admin-input--sm"
                      value={row.valuesText}
                      disabled={readOnly}
                      placeholder="S:50, M:52, L:54"
                      onChange={(e) => updateRow(row.clientKey, { valuesText: e.target.value })}
                      onBlur={() => commit(rows)}
                    />
                  </td>
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
