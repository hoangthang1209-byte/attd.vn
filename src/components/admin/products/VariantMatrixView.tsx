"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Image from "next/image";
import MediaPicker from "@/components/admin/media/MediaPicker";
import type { OptionGroupFormRow } from "@/components/admin/products/ProductOptionGroupBuilder";
import type { MatrixVariantFormRow } from "@/features/products/product-catalog-form-mappers";
import {
  STOCK_STATUS_LABELS,
  VARIANT_STATUS_OPTIONS,
  variantMatrixRowClass,
  variantStatusBadgeClass,
  variantStatusLabel,
} from "@/features/products/product-variant-labels";
import { fieldErrorInputClass, variantRowHasError } from "@/features/products/product-catalog-form-validation";
import {
  getVariantFieldError,
  variantFieldKey,
  variantRefFromRow,
  variantErrorPrefix,
} from "@/features/products/variant-field-errors";

type Props = {
  variants: MatrixVariantFormRow[];
  filteredVariants: MatrixVariantFormRow[];
  optionGroups: OptionGroupFormRow[];
  fieldErrors: Record<string, string>;
  productCode: string;
  defaultMoq: string;
  defaultLeadTime: string;
  selectedKeys: Set<string>;
  manualSkuKeys: Set<string>;
  allVisibleSelected: boolean;
  actionLoadingKey: string | null;
  onToggleSelect: (key: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onUpdateVariant: (clientKey: string, patch: Partial<MatrixVariantFormRow>) => void;
  onEnableManualSku: (clientKey: string) => void;
  onOpenLifecycle: (clientKey: string) => void;
  getOptionValueLabel: (valueId: string) => string;
};

function renderVariantStatusOptions() {
  return VARIANT_STATUS_OPTIONS.map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ));
}

function VariantActionMenu({
  variant,
  isLoading,
  onDetail,
  onManualSku,
  onLifecycle,
}: {
  variant: MatrixVariantFormRow;
  isLoading: boolean;
  onDetail: () => void;
  onManualSku: () => void;
  onLifecycle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="admin-variant-action-menu" ref={ref}>
      <button
        type="button"
        className="btn-secondary btn-sm admin-variant-action-menu__trigger"
        disabled={isLoading}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Thao tác ▾
      </button>
      {open && (
        <div className="admin-variant-action-menu__panel" role="menu">
          <button type="button" role="menuitem" className="admin-variant-action-menu__item" onClick={() => { setOpen(false); onDetail(); }}>
            Sửa chi tiết
          </button>
          <button type="button" role="menuitem" className="admin-variant-action-menu__item" onClick={() => { setOpen(false); onManualSku(); }}>
            Chỉnh mã thủ công
          </button>
          <button type="button" role="menuitem" className="admin-variant-action-menu__item" onClick={() => { setOpen(false); onLifecycle(); }}>
            {variant.id ? "Quản lý trạng thái" : "Xóa khỏi danh sách"}
          </button>
        </div>
      )}
    </div>
  );
}

function InheritedField({
  label,
  inheritedText,
  overrideMode,
  onEnableOverride,
  children,
}: {
  label: string;
  inheritedText: string;
  overrideMode: boolean;
  onEnableOverride: () => void;
  children: React.ReactNode;
}) {
  if (!overrideMode) {
    return (
      <div className="admin-variant-inherited-field">
        <span className="admin-variant-inherited-field__label">{label}</span>
        <span className="admin-variant-inherited-field__value">{inheritedText}</span>
        <button type="button" className="btn-tertiary btn-sm admin-variant-inherited-field__cta" onClick={onEnableOverride}>
          Thiết lập riêng
        </button>
      </div>
    );
  }
  return <div className="admin-variant-override-field">{children}</div>;
}

export default function VariantMatrixView({
  variants,
  filteredVariants,
  optionGroups,
  fieldErrors,
  productCode,
  defaultMoq,
  defaultLeadTime,
  selectedKeys,
  manualSkuKeys,
  allVisibleSelected,
  actionLoadingKey,
  onToggleSelect,
  onToggleSelectAll,
  onUpdateVariant,
  onEnableManualSku,
  onOpenLifecycle,
  getOptionValueLabel,
}: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [moqOverrideKeys, setMoqOverrideKeys] = useState<Set<string>>(new Set());
  const [leadTimeOverrideKeys, setLeadTimeOverrideKeys] = useState<Set<string>>(new Set());
  const [skuEditKey, setSkuEditKey] = useState<string | null>(null);

  function toggleExpanded(clientKey: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(clientKey)) next.delete(clientKey);
      else next.add(clientKey);
      return next;
    });
  }

  function renderSkuCell(variant: MatrixVariantFormRow, variantIndex: number) {
    const ref = variantRefFromRow(variant);
    const skuField = variantFieldKey(ref, "sku");
    const skuError = getVariantFieldError(fieldErrors, ref, "sku", variantIndex);
    const showEditor = skuEditKey === variant.clientKey || manualSkuKeys.has(variant.clientKey) || Boolean(variant.sku.trim());

    if (!showEditor) {
      return (
        <div className="admin-variant-sku-display">
          <span className="admin-variant-sku-display__auto">Tự sinh khi lưu</span>
          <button
            type="button"
            className="btn-tertiary btn-sm admin-variant-sku-display__cta"
            onClick={() => {
              onEnableManualSku(variant.clientKey);
              setSkuEditKey(variant.clientKey);
            }}
          >
            Chỉnh mã thủ công
          </button>
        </div>
      );
    }

    return (
      <div className="admin-variant-sku-editor">
        <input
          className={`form-input admin-variant-sku-input${fieldErrorInputClass(Boolean(skuError))}`}
          value={variant.sku}
          data-field={skuField}
          onChange={(e) => onUpdateVariant(variant.clientKey, { sku: e.target.value })}
          placeholder={productCode ? `${productCode}-…` : "SKU thủ công"}
        />
        {skuError && <p className="admin-field-error" role="alert">{skuError}</p>}
      </div>
    );
  }

  function renderDetailPanel(variant: MatrixVariantFormRow, variantIndex: number) {
    const ref = variantRefFromRow(variant);
    return (
      <div className="admin-variant-detail-panel">
        <div className="admin-variant-detail-grid">
          <div className="admin-variant-detail-field">
            <label className="admin-label">Ảnh biến thể</label>
            <MediaPicker
              value={variant.imageUrl}
              onChange={(url) => onUpdateVariant(variant.clientKey, { imageUrl: url })}
              label="Ảnh biến thể"
              folder="products"
            />
            <input
              className={`form-input${fieldErrorInputClass(Boolean(getVariantFieldError(fieldErrors, ref, "imageUrl", variantIndex)))}`}
              value={variant.imageUrl}
              data-field={variantFieldKey(ref, "imageUrl")}
              onChange={(e) => onUpdateVariant(variant.clientKey, { imageUrl: e.target.value })}
              placeholder="URL ảnh biến thể"
            />
          </div>
          <div className="admin-variant-detail-field">
            <label className="admin-label">Chất liệu riêng</label>
            <input
              className="form-input"
              value={variant.materialOverride}
              onChange={(e) => onUpdateVariant(variant.clientKey, { materialOverride: e.target.value })}
              placeholder="Ghi đè chất liệu (tuỳ chọn)"
            />
          </div>
          <div className="admin-variant-detail-field">
            <label className="admin-label">Giá sỉ</label>
            <input
              className={`form-input${fieldErrorInputClass(Boolean(getVariantFieldError(fieldErrors, ref, "wholesalePrice", variantIndex)))}`}
              type="number"
              value={variant.wholesalePrice}
              data-field={variantFieldKey(ref, "wholesalePrice")}
              onChange={(e) => onUpdateVariant(variant.clientKey, { wholesalePrice: e.target.value })}
            />
          </div>
          <div className="admin-variant-detail-field">
            <label className="admin-label">Giá đại lý</label>
            <input
              className={`form-input${fieldErrorInputClass(Boolean(getVariantFieldError(fieldErrors, ref, "dealerPrice", variantIndex)))}`}
              type="number"
              value={variant.dealerPrice}
              data-field={variantFieldKey(ref, "dealerPrice")}
              onChange={(e) => onUpdateVariant(variant.clientKey, { dealerPrice: e.target.value })}
            />
          </div>
          <div className="admin-variant-detail-field admin-variant-detail-field--wide">
            <label className="admin-label">Ghi chú nội bộ</label>
            <textarea
              className="admin-textarea"
              rows={2}
              value={variant.internalNote}
              onChange={(e) => onUpdateVariant(variant.clientKey, { internalNote: e.target.value })}
            />
          </div>
        </div>
        <div className="admin-variant-detail-options">
          <label className="admin-label">Chỉnh tổ hợp thuộc tính</label>
          <div className="admin-spec-row">
            {optionGroups.map((group) => (
              <select
                key={group.clientKey}
                className="form-input"
                value={
                  variant.optionValueIds.find((valueId) =>
                    group.values.some((value) => value.id === valueId || value.clientKey === valueId),
                  ) ?? ""
                }
                onChange={(e) => {
                  const nextIds = variant.optionValueIds.filter(
                    (valueId) =>
                      !group.values.some((value) => value.id === valueId || value.clientKey === valueId),
                  );
                  if (e.target.value) nextIds.push(e.target.value);
                  const labels = nextIds.map((valueId) => getOptionValueLabel(valueId)).filter(Boolean);
                  onUpdateVariant(variant.clientKey, {
                    optionValueIds: nextIds,
                    displayLabel: labels.join(" / "),
                  });
                }}
              >
                <option value="">{group.name}</option>
                {group.values.map((value) => (
                  <option key={value.clientKey} value={value.id ?? value.clientKey}>
                    {value.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderMobileCard(variant: MatrixVariantFormRow, variantIndex: number) {
    const ref = variantRefFromRow(variant);
    const hasRowError = variantRowHasError(fieldErrors, variant, variants);
    const isExpanded = expandedKeys.has(variant.clientKey);
    const moqInherited = !moqOverrideKeys.has(variant.clientKey) && !variant.moqOverride.trim();
    const leadInherited = !leadTimeOverrideKeys.has(variant.clientKey) && !variant.leadTimeOverride.trim();

    return (
      <article
        key={variant.clientKey}
        className={`admin-variant-card${hasRowError ? " admin-variant-card--error" : ""}`}
        data-variant-row={variant.clientKey}
        data-field-prefix={variantErrorPrefix(ref)}
      >
        <div className="admin-variant-card__head">
          <label className="admin-catalog-toggle">
            <input
              type="checkbox"
              checked={selectedKeys.has(variant.clientKey)}
              onChange={(e) => onToggleSelect(variant.clientKey, e.target.checked)}
            />
          </label>
          {variant.imageUrl ? (
            <Image src={variant.imageUrl} alt="" width={48} height={48} className="admin-variant-thumb" />
          ) : (
            <span className="admin-variant-card__thumb-placeholder" aria-hidden>—</span>
          )}
          <div className="admin-variant-card__title">
            <strong>{variant.displayLabel || "—"}</strong>
            {variant.variantStatus !== "ACTIVE" && (
              <span className={variantStatusBadgeClass(variant.variantStatus)}>
                {variantStatusLabel(variant.variantStatus)}
              </span>
            )}
          </div>
          <VariantActionMenu
            variant={variant}
            isLoading={actionLoadingKey === variant.clientKey}
            onDetail={() => toggleExpanded(variant.clientKey)}
            onManualSku={() => {
              onEnableManualSku(variant.clientKey);
              setSkuEditKey(variant.clientKey);
            }}
            onLifecycle={() => onOpenLifecycle(variant.clientKey)}
          />
        </div>
        <div className="admin-variant-card__chips">
          {variant.optionValueIds.map((valueId) => (
            <span key={valueId} className="admin-variant-option-chip">{getOptionValueLabel(valueId)}</span>
          ))}
        </div>
        <div className="admin-variant-card__grid">
          <div><span className="admin-variant-card__label">SKU</span>{renderSkuCell(variant, variantIndex)}</div>
          <div>
            <span className="admin-variant-card__label">Tồn kho</span>
            <input
              className={`form-input${fieldErrorInputClass(Boolean(getVariantFieldError(fieldErrors, ref, "stockQty", variantIndex)))}`}
              type="number"
              min="0"
              value={variant.stockQty}
              data-field={variantFieldKey(ref, "stockQty")}
              onChange={(e) => onUpdateVariant(variant.clientKey, { stockQty: e.target.value })}
            />
            <select
              className="form-input"
              value={variant.stockStatus}
              onChange={(e) => onUpdateVariant(variant.clientKey, { stockStatus: e.target.value })}
            >
              <option value="IN_STOCK">Còn hàng</option>
              <option value="LOW_STOCK">Sắp hết</option>
              <option value="OUT_OF_STOCK">Hết hàng</option>
              <option value="PREORDER">Đặt trước</option>
            </select>
          </div>
          <div>
            <span className="admin-variant-card__label">MOQ</span>
            <InheritedField
              label="MOQ"
              inheritedText="Kế thừa từ sản phẩm"
              overrideMode={!moqInherited}
              onEnableOverride={() => setMoqOverrideKeys((prev) => new Set(prev).add(variant.clientKey))}
            >
              <input
                className={`form-input${fieldErrorInputClass(Boolean(getVariantFieldError(fieldErrors, ref, "moqOverride", variantIndex)))}`}
                type="number"
                value={variant.moqOverride}
                data-field={variantFieldKey(ref, "moqOverride")}
                onChange={(e) => onUpdateVariant(variant.clientKey, { moqOverride: e.target.value })}
              />
            </InheritedField>
          </div>
          <div>
            <span className="admin-variant-card__label">Lead time</span>
            <InheritedField
              label="Lead time"
              inheritedText="Kế thừa từ sản phẩm"
              overrideMode={!leadInherited}
              onEnableOverride={() => setLeadTimeOverrideKeys((prev) => new Set(prev).add(variant.clientKey))}
            >
              <input
                className={`form-input${fieldErrorInputClass(Boolean(getVariantFieldError(fieldErrors, ref, "leadTimeOverride", variantIndex)))}`}
                value={variant.leadTimeOverride}
                data-field={variantFieldKey(ref, "leadTimeOverride")}
                onChange={(e) => onUpdateVariant(variant.clientKey, { leadTimeOverride: e.target.value })}
              />
            </InheritedField>
          </div>
        </div>
        <button type="button" className="btn-tertiary btn-sm" onClick={() => toggleExpanded(variant.clientKey)}>
          {isExpanded ? "Ẩn chi tiết" : "Sửa chi tiết"}
        </button>
        {isExpanded && renderDetailPanel(variant, variantIndex)}
      </article>
    );
  }

  return (
    <>
      <div className="admin-variant-matrix-desktop">
        <div className="admin-variant-matrix-scroll">
          <table className="admin-variant-matrix-table">
            <colgroup>
              <col className="admin-variant-col-select" />
              <col className="admin-variant-col-variant" />
              <col className="admin-variant-col-sku" />
              <col className="admin-variant-col-status" />
              <col className="admin-variant-col-stock" />
              <col className="admin-variant-col-moq" />
              <col className="admin-variant-col-lead" />
              <col className="admin-variant-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(e) => onToggleSelectAll(e.target.checked)}
                    aria-label="Chọn tất cả biến thể đang hiển thị"
                  />
                </th>
                <th>Biến thể / thuộc tính</th>
                <th>SKU</th>
                <th>Trạng thái</th>
                <th>Tồn kho</th>
                <th>MOQ</th>
                <th>Lead time</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredVariants.map((variant) => {
                const variantIndex = variants.findIndex((row) => row.clientKey === variant.clientKey);
                const ref = variantRefFromRow(variant);
                const prefix = variantFieldKey(ref, "").slice(0, -1);
                const hasRowError = variantRowHasError(fieldErrors, variant, variants);
                const isExpanded = expandedKeys.has(variant.clientKey);
                const moqInherited = !moqOverrideKeys.has(variant.clientKey) && !variant.moqOverride.trim();
                const leadInherited = !leadTimeOverrideKeys.has(variant.clientKey) && !variant.leadTimeOverride.trim();

                return (
                  <Fragment key={variant.clientKey}>
                    <tr
                      className={`${variantMatrixRowClass(variant.variantStatus)}${hasRowError ? " admin-variant-row--error" : ""}`}
                      data-variant-row={variant.clientKey}
                      data-field-prefix={prefix}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(variant.clientKey)}
                          onChange={(e) => onToggleSelect(variant.clientKey, e.target.checked)}
                        />
                      </td>
                      <td>
                        <div className="admin-variant-label-cell">
                          <span className="admin-variant-label-cell__title">{variant.displayLabel || "—"}</span>
                          <div className="admin-variant-option-list">
                            {variant.optionValueIds.map((valueId) => (
                              <span key={valueId} className="admin-variant-option-chip">
                                {getOptionValueLabel(valueId)}
                              </span>
                            ))}
                          </div>
                          {variant.variantStatus !== "ACTIVE" && (
                            <span className={variantStatusBadgeClass(variant.variantStatus)}>
                              {variantStatusLabel(variant.variantStatus)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{renderSkuCell(variant, variantIndex)}</td>
                      <td>
                        <select
                          className="form-input"
                          value={variant.variantStatus}
                          onChange={(e) => onUpdateVariant(variant.clientKey, { variantStatus: e.target.value })}
                        >
                          {renderVariantStatusOptions()}
                        </select>
                      </td>
                      <td>
                        <div className="admin-variant-stock-cell">
                          <input
                            className={`form-input${fieldErrorInputClass(Boolean(getVariantFieldError(fieldErrors, ref, "stockQty", variantIndex)))}`}
                            type="number"
                            min="0"
                            value={variant.stockQty}
                            data-field={variantFieldKey(ref, "stockQty")}
                            onChange={(e) => onUpdateVariant(variant.clientKey, { stockQty: e.target.value })}
                          />
                          <select
                            className="form-input"
                            value={variant.stockStatus}
                            onChange={(e) => onUpdateVariant(variant.clientKey, { stockStatus: e.target.value })}
                            aria-label="Trạng thái tồn kho"
                          >
                            <option value="IN_STOCK">Còn hàng</option>
                            <option value="LOW_STOCK">Sắp hết</option>
                            <option value="OUT_OF_STOCK">Hết hàng</option>
                            <option value="PREORDER">Đặt trước</option>
                          </select>
                          <span className="admin-variant-stock-cell__hint">
                            {STOCK_STATUS_LABELS[variant.stockStatus] ?? variant.stockStatus}
                          </span>
                        </div>
                      </td>
                      <td>
                        <InheritedField
                          label="MOQ"
                          inheritedText="Kế thừa từ sản phẩm"
                          overrideMode={!moqInherited}
                          onEnableOverride={() => setMoqOverrideKeys((prev) => new Set(prev).add(variant.clientKey))}
                        >
                          <input
                            className={`form-input${fieldErrorInputClass(Boolean(getVariantFieldError(fieldErrors, ref, "moqOverride", variantIndex)))}`}
                            type="number"
                            value={variant.moqOverride}
                            data-field={variantFieldKey(ref, "moqOverride")}
                            onChange={(e) => onUpdateVariant(variant.clientKey, { moqOverride: e.target.value })}
                            placeholder={defaultMoq || undefined}
                          />
                        </InheritedField>
                      </td>
                      <td>
                        <InheritedField
                          label="Lead time"
                          inheritedText="Kế thừa từ sản phẩm"
                          overrideMode={!leadInherited}
                          onEnableOverride={() => setLeadTimeOverrideKeys((prev) => new Set(prev).add(variant.clientKey))}
                        >
                          <input
                            className={`form-input${fieldErrorInputClass(Boolean(getVariantFieldError(fieldErrors, ref, "leadTimeOverride", variantIndex)))}`}
                            value={variant.leadTimeOverride}
                            data-field={variantFieldKey(ref, "leadTimeOverride")}
                            onChange={(e) => onUpdateVariant(variant.clientKey, { leadTimeOverride: e.target.value })}
                            placeholder={defaultLeadTime || undefined}
                          />
                        </InheritedField>
                      </td>
                      <td>
                        <VariantActionMenu
                          variant={variant}
                          isLoading={actionLoadingKey === variant.clientKey}
                          onDetail={() => toggleExpanded(variant.clientKey)}
                          onManualSku={() => {
                            onEnableManualSku(variant.clientKey);
                            setSkuEditKey(variant.clientKey);
                          }}
                          onLifecycle={() => onOpenLifecycle(variant.clientKey)}
                        />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="admin-variant-detail-row">
                        <td colSpan={8}>{renderDetailPanel(variant, variantIndex)}</td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-variant-matrix-mobile">
        {filteredVariants.map((variant) => {
          const variantIndex = variants.findIndex((row) => row.clientKey === variant.clientKey);
          return renderMobileCard(variant, variantIndex);
        })}
      </div>
    </>
  );
}
