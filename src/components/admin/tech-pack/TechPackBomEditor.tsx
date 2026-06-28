"use client";

import { useCallback, useEffect, useState } from "react";
import type { TechPackBomCategory } from "@prisma/client";
import {
  TECH_PACK_BOM_CATEGORIES,
  TECH_PACK_BOM_CATEGORY_LABELS,
} from "@/features/tech-pack/tech-pack-bom-labels";
import ProductionMasterSearchSelect, {
  type MasterSearchItem,
} from "@/components/admin/production-master/ProductionMasterSearchSelect";
import {
  bomCategoryPrefersMaterialPicker,
  bomCategoryPrefersTrimPicker,
} from "@/features/production-master/bom-category-mapping";
import { detectBomDuplicates } from "@/features/tech-pack/bom-duplicate-detection";

export type BomRow = {
  clientKey: string;
  sortOrder: number;
  category: TechPackBomCategory;
  itemName: string;
  specification: string;
  color: string;
  supplier: string;
  unit: string;
  consumption: string;
  wastePercent: string;
  notes: string;
  materialId: string;
  trimId: string;
  supplierId: string;
  materialLabel: string;
  trimLabel: string;
  supplierLabel: string;
  materialCode: string;
  trimCode: string;
  supplierCode: string;
};

type ServerBomItem = {
  id: string;
  sortOrder: number;
  category: TechPackBomCategory;
  itemName: string;
  specification: string | null;
  color: string | null;
  supplier: string | null;
  unit: string | null;
  consumption: string | null;
  wastePercent: string | null;
  notes: string | null;
  materialId?: string | null;
  trimId?: string | null;
  supplierId?: string | null;
  material?: { id: string; code: string; name: string } | null;
  trim?: { id: string; code: string; name: string } | null;
  supplierRef?: { id: string; code: string; name: string } | null;
};

const FABRIC_BOM_CATEGORIES = new Set<TechPackBomCategory>(["MAIN_FABRIC", "RIB"]);

function masterLabel(ref?: { code: string; name: string } | null): string {
  return ref ? `${ref.code} — ${ref.name}` : "";
}

function toRows(items: ServerBomItem[]): BomRow[] {
  return items.map((item) => ({
    clientKey: item.id,
    sortOrder: item.sortOrder,
    category: item.category,
    itemName: item.itemName,
    specification: item.specification ?? "",
    color: item.color ?? "",
    supplier: item.supplier ?? "",
    unit: item.unit ?? "",
    consumption: item.consumption ?? "",
    wastePercent: item.wastePercent ?? "",
    notes: item.notes ?? "",
    materialId: item.materialId ?? "",
    trimId: item.trimId ?? "",
    supplierId: item.supplierId ?? "",
    materialLabel: masterLabel(item.material),
    trimLabel: masterLabel(item.trim),
    supplierLabel: masterLabel(item.supplierRef),
    materialCode: item.material?.code ?? "",
    trimCode: item.trim?.code ?? "",
    supplierCode: item.supplierRef?.code ?? "",
  }));
}

function emptyRow(sortOrder: number): BomRow {
  return {
    clientKey: `new-${Date.now()}-${sortOrder}`,
    sortOrder,
    category: "OTHER",
    itemName: "",
    specification: "",
    color: "",
    supplier: "",
    unit: "",
    consumption: "",
    wastePercent: "",
    notes: "",
    materialId: "",
    trimId: "",
    supplierId: "",
    materialLabel: "",
    trimLabel: "",
    supplierLabel: "",
    materialCode: "",
    trimCode: "",
    supplierCode: "",
  };
}

function materialSpec(item: MasterSearchItem): string {
  return [item.composition, item.gsm ? `${item.gsm} GSM` : null, item.width ? `Rộng ${item.width}` : null]
    .filter(Boolean)
    .join(" · ");
}

type Props = {
  techPackId: string;
  items: ServerBomItem[];
  readOnly?: boolean;
  patternProductionMaterialCategory?: string | null;
  onSaved?: () => void;
};

export default function TechPackBomEditor({
  techPackId,
  items,
  readOnly,
  patternProductionMaterialCategory,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<BomRow[]>(() => toRows(items));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkSupplierId, setBulkSupplierId] = useState<string | null>(null);
  const [bulkSupplierLabel, setBulkSupplierLabel] = useState<string | null>(null);
  const [bulkMaterialId, setBulkMaterialId] = useState<string | null>(null);
  const [bulkMaterialLabel, setBulkMaterialLabel] = useState<string | null>(null);
  const [bulkTrimId, setBulkTrimId] = useState<string | null>(null);
  const [bulkTrimLabel, setBulkTrimLabel] = useState<string | null>(null);

  useEffect(() => {
    setRows(toRows(items));
    setSelectedKeys(new Set());
  }, [items]);

  const duplicateIssues = detectBomDuplicates(
    rows.map((row) => ({
      id: row.clientKey,
      category: row.category,
      itemName: row.itemName,
      materialId: row.materialId || null,
      trimId: row.trimId || null,
      supplierId: row.supplierId || null,
    })),
  );
  const duplicateKeys = new Set(duplicateIssues.filter((i) => i.severity === "warning").map((i) => i.bomItemId));
  const duplicateHints = new Map(
    duplicateIssues
      .filter((i) => i.severity === "warning")
      .map((i) => [i.bomItemId, i.message] as const),
  );

  const allSelected = rows.length > 0 && selectedKeys.size === rows.length;

  function toggleSelectAll() {
    if (allSelected) setSelectedKeys(new Set());
    else setSelectedKeys(new Set(rows.map((r) => r.clientKey)));
  }

  function toggleSelect(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function applyBulkPatch(patchFn: (row: BomRow) => Partial<BomRow> | null) {
    const targets = rows.filter((r) => selectedKeys.has(r.clientKey));
    if (targets.length === 0) return;
    let applied = 0;
    const next = rows.map((row) => {
      if (!selectedKeys.has(row.clientKey)) return row;
      const patch = patchFn(row);
      if (!patch) return row;
      applied += 1;
      return { ...row, ...patch };
    });
    setBulkMessage(`Đã áp dụng cho ${applied} dòng.`);
    void saveRows(next);
  }

  function bulkApplySupplier(item: MasterSearchItem | null) {
    if (!item) return;
    applyBulkPatch(() => ({
      supplierId: item.id,
      supplierLabel: `${item.code} — ${item.name}`,
      supplierCode: item.code,
      supplier: item.name,
    }));
  }

  function bulkApplyMaterial(item: MasterSearchItem | null) {
    if (!item) return;
    applyBulkPatch((row) => {
      if (!bomCategoryPrefersMaterialPicker(row.category)) return null;
      return {
        materialId: item.id,
        materialLabel: `${item.code} — ${item.name}`,
        materialCode: item.code,
        itemName: item.name,
        specification: materialSpec(item) || row.specification,
        color: item.defaultColor || row.color,
        supplier: item.supplier?.name || row.supplier,
        trimId: "",
        trimLabel: "",
        trimCode: "",
      };
    });
  }

  function bulkApplyTrim(item: MasterSearchItem | null) {
    if (!item) return;
    applyBulkPatch((row) => {
      if (!bomCategoryPrefersTrimPicker(row.category)) return null;
      return {
        trimId: item.id,
        trimLabel: `${item.code} — ${item.name}`,
        trimCode: item.code,
        itemName: item.name,
        supplier: item.supplier?.name || row.supplier,
        materialId: "",
        materialLabel: "",
        materialCode: "",
      };
    });
  }

  function bulkClearMasterLinks() {
    applyBulkPatch(() => ({
      materialId: "",
      trimId: "",
      supplierId: "",
      materialLabel: "",
      trimLabel: "",
      supplierLabel: "",
      materialCode: "",
      trimCode: "",
      supplierCode: "",
    }));
  }

  const persist = useCallback(
    async (nextRows: BomRow[]) => {
      setSaving(true);
      setError(null);
      const payload = nextRows.map((row, index) => ({
        sortOrder: index,
        category: row.category,
        itemName: row.itemName,
        specification: row.specification || null,
        color: row.color || null,
        supplier: row.supplier || null,
        unit: row.unit || null,
        consumption: row.consumption || null,
        wastePercent: row.wastePercent || null,
        notes: row.notes || null,
        materialId: row.materialId || null,
        trimId: row.trimId || null,
        supplierId: row.supplierId || null,
      }));
      const res = await fetch(`/api/tech-packs/${techPackId}/bom`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Không thể lưu BOM");
      } else {
        onSaved?.();
      }
      setSaving(false);
    },
    [techPackId, onSaved],
  );

  function updateRow(key: string, patch: Partial<BomRow>) {
    if (readOnly) return;
    setRows((prev) => prev.map((r) => (r.clientKey === key ? { ...r, ...patch } : r)));
  }

  async function saveRows(next: BomRow[]) {
    const normalized = next.map((r, i) => ({ ...r, sortOrder: i }));
    setRows(normalized);
    await persist(normalized);
  }

  function applyMaterial(key: string, item: MasterSearchItem | null) {
    const row = rows.find((r) => r.clientKey === key);
    if (!row) return;
    const patch: Partial<BomRow> = {
      materialId: item?.id ?? "",
      materialLabel: item ? `${item.code} — ${item.name}` : "",
      materialCode: item?.code ?? "",
      trimId: "",
      trimLabel: "",
      trimCode: "",
    };
    if (item) {
      patch.itemName = item.name;
      patch.specification = materialSpec(item) || row.specification;
      if (item.defaultColor) patch.color = item.defaultColor;
      if (item.supplier?.name) patch.supplier = item.supplier.name;
    }
    const next = rows.map((r) => (r.clientKey === key ? { ...r, ...patch } : r));
    void saveRows(next);
  }

  function applyTrim(key: string, item: MasterSearchItem | null) {
    const row = rows.find((r) => r.clientKey === key);
    if (!row) return;
    const patch: Partial<BomRow> = {
      trimId: item?.id ?? "",
      trimLabel: item ? `${item.code} — ${item.name}` : "",
      trimCode: item?.code ?? "",
      materialId: "",
      materialLabel: "",
      materialCode: "",
    };
    if (item) {
      patch.itemName = item.name;
      if (item.supplier?.name) patch.supplier = item.supplier.name;
    }
    const next = rows.map((r) => (r.clientKey === key ? { ...r, ...patch } : r));
    void saveRows(next);
  }

  function applySupplier(key: string, item: MasterSearchItem | null) {
    const patch: Partial<BomRow> = {
      supplierId: item?.id ?? "",
      supplierLabel: item ? `${item.code} — ${item.name}` : "",
      supplierCode: item?.code ?? "",
      supplier: item?.name ?? rows.find((r) => r.clientKey === key)?.supplier ?? "",
    };
    const next = rows.map((r) => (r.clientKey === key ? { ...r, ...patch } : r));
    void saveRows(next);
  }

  function addRow() {
    const next = [...rows, emptyRow(rows.length)];
    void saveRows(next);
  }

  function duplicateRow(key: string) {
    const idx = rows.findIndex((r) => r.clientKey === key);
    if (idx < 0) return;
    const copy = {
      ...rows[idx],
      clientKey: `dup-${Date.now()}`,
    };
    const next = [...rows.slice(0, idx + 1), copy, ...rows.slice(idx + 1)];
    void saveRows(next);
  }

  function deleteRow(key: string) {
    void saveRows(rows.filter((r) => r.clientKey !== key));
  }

  function moveRow(key: string, direction: -1 | 1) {
    const idx = rows.findIndex((r) => r.clientKey === key);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[idx], next[target]] = [next[target], next[idx]];
    void saveRows(next);
  }

  function handleDrop(targetKey: string) {
    if (!dragKey || dragKey === targetKey) return;
    const from = rows.findIndex((r) => r.clientKey === dragKey);
    const to = rows.findIndex((r) => r.clientKey === targetKey);
    if (from < 0 || to < 0) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragKey(null);
    void saveRows(next);
  }

  if (rows.length === 0 && readOnly) {
    return <p className="admin-muted">Chưa có dòng BOM.</p>;
  }

  return (
    <div className="tech-pack-bom-editor">
      {error && <p className="admin-error">{error}</p>}
      {saving && <p className="admin-muted">Đang lưu BOM...</p>}

      <div className="tech-pack-bom-editor__toolbar">
        {!readOnly && (
          <>
            <button type="button" className="admin-btn admin-btn--primary admin-btn--xs" onClick={addRow}>
              Thêm dòng
            </button>
            {selectedKeys.size > 0 && (
              <span className="admin-muted" style={{ marginLeft: 8, fontSize: 13 }}>
                Đã chọn {selectedKeys.size} dòng
              </span>
            )}
          </>
        )}
      </div>

      {!readOnly && selectedKeys.size > 0 && (
        <div className="tech-pack-bom-editor__bulk">
          <strong>Áp dụng hàng loạt</strong>
          <div className="tech-pack-bom-editor__bulk-actions">
            <ProductionMasterSearchSelect
              apiPath="/api/production-suppliers"
              value={bulkSupplierId}
              displayLabel={bulkSupplierLabel}
              placeholder="Áp dụng nhà cung cấp"
              onSelect={(item) => {
                setBulkSupplierId(item?.id ?? null);
                setBulkSupplierLabel(item ? `${item.code} — ${item.name}` : null);
                bulkApplySupplier(item);
              }}
            />
            <ProductionMasterSearchSelect
              apiPath="/api/production-materials"
              value={bulkMaterialId}
              displayLabel={bulkMaterialLabel}
              placeholder="Áp dụng nguyên liệu"
              onSelect={(item) => {
                setBulkMaterialId(item?.id ?? null);
                setBulkMaterialLabel(item ? `${item.code} — ${item.name}` : null);
                bulkApplyMaterial(item);
              }}
            />
            <ProductionMasterSearchSelect
              apiPath="/api/production-trims"
              value={bulkTrimId}
              displayLabel={bulkTrimLabel}
              placeholder="Áp dụng phụ liệu"
              onSelect={(item) => {
                setBulkTrimId(item?.id ?? null);
                setBulkTrimLabel(item ? `${item.code} — ${item.name}` : null);
                bulkApplyTrim(item);
              }}
            />
            <button type="button" className="admin-btn admin-btn--xs" onClick={bulkClearMasterLinks}>
              Xóa liên kết master
            </button>
          </div>
          {bulkMessage && <p className="admin-muted" style={{ fontSize: 12, margin: "6px 0 0" }}>{bulkMessage}</p>}
        </div>
      )}

      {patternProductionMaterialCategory && (
        <p className="admin-muted" style={{ marginBottom: 8, fontSize: 12 }}>
          Đang gợi ý nguyên liệu theo nhóm chất liệu của rập.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="admin-muted">Chưa có dòng BOM. Bấm &quot;Thêm dòng&quot; để bắt đầu.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--compact tech-pack-bom-table">
            <thead>
              <tr>
                {!readOnly && (
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                {!readOnly && <th aria-label="Sắp xếp" />}
                <th>Danh mục</th>
                {!readOnly && <th>Thư viện</th>}
                <th>Tên</th>
                <th>Quy cách</th>
                <th>Màu</th>
                <th>Nhà cung cấp</th>
                <th>ĐVT</th>
                <th>Định mức</th>
                <th>Hao hụt %</th>
                <th>Ghi chú</th>
                {!readOnly && <th aria-label="Thao tác" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const showMaterial = bomCategoryPrefersMaterialPicker(row.category);
                const showTrim = bomCategoryPrefersTrimPicker(row.category);
                const materialCategoryFilter =
                  patternProductionMaterialCategory &&
                  FABRIC_BOM_CATEGORIES.has(row.category)
                    ? patternProductionMaterialCategory
                    : null;
                return (
                  <tr
                    key={row.clientKey}
                    draggable={!readOnly}
                    onDragStart={() => setDragKey(row.clientKey)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(row.clientKey)}
                    className={[
                      dragKey === row.clientKey ? "tech-pack-bom-table__row--drag" : "",
                      duplicateKeys.has(row.clientKey) ? "tech-pack-bom-table__row--duplicate" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    title={duplicateHints.get(row.clientKey) ?? undefined}
                  >
                    {!readOnly && (
                      <td>
                        <input
                          type="checkbox"
                          aria-label="Chọn dòng"
                          checked={selectedKeys.has(row.clientKey)}
                          onChange={() => toggleSelect(row.clientKey)}
                        />
                      </td>
                    )}
                    {!readOnly && (
                      <td className="tech-pack-bom-table__handle" title="Kéo để sắp xếp">
                        <span className="tech-pack-bom-table__grip">⋮⋮</span>
                        <div className="tech-pack-bom-table__move">
                          <button type="button" className="admin-btn admin-btn--xs" onClick={() => moveRow(row.clientKey, -1)}>
                            ↑
                          </button>
                          <button type="button" className="admin-btn admin-btn--xs" onClick={() => moveRow(row.clientKey, 1)}>
                            ↓
                          </button>
                        </div>
                      </td>
                    )}
                    <td>
                      <select
                        className="admin-select admin-select--sm"
                        value={row.category}
                        disabled={readOnly}
                        onChange={(e) => updateRow(row.clientKey, { category: e.target.value as TechPackBomCategory })}
                        onBlur={() => void persist(rows)}
                      >
                        {TECH_PACK_BOM_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {TECH_PACK_BOM_CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </td>
                    {!readOnly && (
                      <td className="tech-pack-bom-table__library">
                        {showMaterial && (
                          <ProductionMasterSearchSelect
                            apiPath="/api/production-materials"
                            value={row.materialId || null}
                            displayLabel={row.materialLabel}
                            placeholder="Vật liệu..."
                            categoryFilter={materialCategoryFilter}
                            onSelect={(item) => applyMaterial(row.clientKey, item)}
                          />
                        )}
                        {showTrim && (
                          <ProductionMasterSearchSelect
                            apiPath="/api/production-trims"
                            value={row.trimId || null}
                            displayLabel={row.trimLabel}
                            placeholder="Phụ liệu..."
                            onSelect={(item) => applyTrim(row.clientKey, item)}
                          />
                        )}
                        {showMaterial && showTrim && (
                          <span className="admin-muted" style={{ fontSize: 11 }}>
                            Vật liệu hoặc phụ liệu
                          </span>
                        )}
                        {!showMaterial && !showTrim && (
                          <span className="admin-muted" style={{ fontSize: 12 }}>
                            Nhập tay
                          </span>
                        )}
                      </td>
                    )}
                    {(
                      [
                        ["itemName", row.itemName, row.materialCode || row.trimCode],
                        ["specification", row.specification, ""],
                        ["color", row.color, ""],
                      ] as const
                    ).map(([field, value, masterCode]) => (
                      <td key={field}>
                        {field === "itemName" && masterCode ? (
                          <div>
                            <span className="tech-pack-bom-table__code">{masterCode}</span>{" "}
                            <input
                              className="admin-input admin-input--sm"
                              value={value}
                              disabled={readOnly}
                              onChange={(e) => updateRow(row.clientKey, { [field]: e.target.value })}
                              onBlur={() => void persist(rows)}
                            />
                            {duplicateHints.get(row.clientKey) && (
                              <span className="tech-pack-bom-table__dup-hint">{duplicateHints.get(row.clientKey)}</span>
                            )}
                          </div>
                        ) : (
                          <input
                            className="admin-input admin-input--sm"
                            value={value}
                            disabled={readOnly}
                            onChange={(e) => updateRow(row.clientKey, { [field]: e.target.value })}
                            onBlur={() => void persist(rows)}
                          />
                        )}
                      </td>
                    ))}
                    <td>
                      {readOnly ? (
                        <div>
                          {row.supplierCode && (
                            <span className="tech-pack-bom-table__code">{row.supplierCode}</span>
                          )}{" "}
                          {row.supplier}
                        </div>
                      ) : (
                        <div className="tech-pack-bom-table__supplier">
                          <ProductionMasterSearchSelect
                            apiPath="/api/production-suppliers"
                            value={row.supplierId || null}
                            displayLabel={row.supplierLabel}
                            placeholder="NCC..."
                            onSelect={(item) => applySupplier(row.clientKey, item)}
                          />
                          <input
                            className="admin-input admin-input--sm"
                            value={row.supplier}
                            onChange={(e) => updateRow(row.clientKey, { supplier: e.target.value })}
                            onBlur={() => void persist(rows)}
                          />
                        </div>
                      )}
                    </td>
                    {(
                      [
                        ["unit", row.unit],
                        ["consumption", row.consumption],
                        ["wastePercent", row.wastePercent],
                        ["notes", row.notes],
                      ] as const
                    ).map(([field, value]) => (
                      <td key={field}>
                        <input
                          className="admin-input admin-input--sm"
                          value={value}
                          disabled={readOnly}
                          onChange={(e) => updateRow(row.clientKey, { [field]: e.target.value })}
                          onBlur={() => void persist(rows)}
                        />
                      </td>
                    ))}
                    {!readOnly && (
                      <td className="tech-pack-bom-table__actions">
                        <button type="button" className="admin-btn admin-btn--xs" onClick={() => duplicateRow(row.clientKey)}>
                          Sao chép
                        </button>
                        <button type="button" className="admin-btn admin-btn--xs admin-btn--danger" onClick={() => deleteRow(row.clientKey)}>
                          Xóa
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
