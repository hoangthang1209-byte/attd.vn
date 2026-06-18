"use client";

import Image from "next/image";
import { isValidImageSrc } from "@/lib/imagePaths";
import type { PublicVariantRow } from "@/lib/productVariants";
import {
  VARIANT_STOCK_COLORS,
  VARIANT_STOCK_LABELS,
  getVariantSizeKey,
} from "@/lib/productVariants";

type ProductOptionTableProps = {
  variants: PublicVariantRow[];
  selectedVariantId?: string | null;
  onSelectVariant?: (variantId: string) => void;
  showHeading?: boolean;
};

function VariantCard({
  v,
  isSelected,
  onSelect,
}: {
  v: PublicVariantRow;
  isSelected: boolean;
  onSelect?: () => void;
}) {
  const sizeInfo = getVariantSizeKey(v);
  const colorInfo = v.colorName;
  const statusLabel = VARIANT_STOCK_LABELS[v.stockStatus] ?? "—";
  const statusColor = VARIANT_STOCK_COLORS[v.stockStatus] ?? "#6b7280";
  const hasImg = v.imageUrl && isValidImageSrc(v.imageUrl);

  return (
    <article
      className={`mp-option-card mp-option-card--selectable${
        isSelected ? " mp-option-card--active" : ""
      }`}
    >
      <button type="button" className="mp-option-card-btn" onClick={onSelect}>
        {hasImg && (
          <div className="mp-option-card-img">
            <Image
              src={v.imageUrl!}
              alt={colorInfo ?? v.sku}
              fill
              sizes="64px"
              className="mp-option-card-photo"
            />
          </div>
        )}
        <div className="mp-option-card-body">
          <p className="mp-option-card-code">{v.sku}</p>
          {colorInfo && (
            <p className="mp-option-card-row">
              <span className="mp-option-card-label">Màu sắc</span>
              <span className="mp-option-color">
                {v.colorCode && (
                  <span
                    className="mp-option-color-dot"
                    style={{
                      background: v.colorCode.startsWith("#") ? v.colorCode : undefined,
                    }}
                  />
                )}
                {colorInfo}
              </span>
            </p>
          )}
          {sizeInfo && (
            <p className="mp-option-card-row">
              <span className="mp-option-card-label">Size / Kích thước</span>
              <span>{sizeInfo}</span>
            </p>
          )}
          <p className="mp-option-card-row">
            <span className="mp-option-card-label">Tình trạng hàng</span>
            <span
              className="mp-option-stock"
              style={{ color: statusColor, borderColor: statusColor }}
            >
              {statusLabel}
            </span>
          </p>
          {v.stockQty != null && v.stockQty > 0 && (
            <p className="mp-option-card-row">
              <span className="mp-option-card-label">Tồn kho tham khảo</span>
              <span>{v.stockQty}</span>
            </p>
          )}
        </div>
      </button>
    </article>
  );
}

export default function ProductOptionTable({
  variants,
  selectedVariantId,
  onSelectVariant,
  showHeading = true,
}: ProductOptionTableProps) {
  if (variants.length === 0) return null;

  return (
    <div className="mp-option-table-wrap" id="mp-pdp-options">
      {showHeading && (
        <>
          <h2 className="mp-option-table-title">Lựa chọn sản phẩm</h2>
          <p className="mp-option-table-desc">
            Chọn màu sắc, size hoặc quy cách phù hợp với nhu cầu đặt hàng.
          </p>
        </>
      )}

      <div className="mp-option-cards">
        {variants.map((v) => (
          <VariantCard
            key={v.id}
            v={v}
            isSelected={selectedVariantId === v.id}
            onSelect={onSelectVariant ? () => onSelectVariant(v.id) : undefined}
          />
        ))}
      </div>

      <div className="mp-option-table-scroll mp-option-table-scroll--desktop">
        <table className="mp-option-table">
          <thead>
            <tr>
              <th aria-hidden />
              <th>Mã sản phẩm</th>
              <th>Màu sắc</th>
              <th>Size / Kích thước / Dung tích</th>
              <th>Tình trạng hàng</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => {
              const sizeInfo = getVariantSizeKey(v);
              const colorInfo = v.colorName;
              const statusLabel = VARIANT_STOCK_LABELS[v.stockStatus] ?? "—";
              const statusColor = VARIANT_STOCK_COLORS[v.stockStatus] ?? "#6b7280";
              const hasImg = v.imageUrl && isValidImageSrc(v.imageUrl);
              const isSelected = selectedVariantId === v.id;

              return (
                <tr
                  key={v.id}
                  className={`mp-option-table-row${
                    isSelected ? " mp-option-table-row--active" : ""
                  }${onSelectVariant ? " mp-option-table-row--clickable" : ""}`}
                  onClick={
                    onSelectVariant ? () => onSelectVariant(v.id) : undefined
                  }
                  role={onSelectVariant ? "button" : undefined}
                  tabIndex={onSelectVariant ? 0 : undefined}
                  onKeyDown={
                    onSelectVariant
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectVariant(v.id);
                          }
                        }
                      : undefined
                  }
                >
                  <td className="mp-option-table-thumb-cell">
                    {hasImg ? (
                      <span className="mp-option-table-thumb">
                        <Image src={v.imageUrl!} alt="" fill sizes="48px" />
                      </span>
                    ) : (
                      <span
                        className="mp-option-table-thumb mp-option-table-thumb--empty"
                        aria-hidden
                      />
                    )}
                  </td>
                  <td>
                    <code className="mp-option-code">{v.sku}</code>
                  </td>
                  <td>
                    {colorInfo ? (
                      <span className="mp-option-color">
                        {v.colorCode && (
                          <span
                            className="mp-option-color-dot"
                            style={{
                              background: v.colorCode.startsWith("#")
                                ? v.colorCode
                                : undefined,
                            }}
                          />
                        )}
                        {colorInfo}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{sizeInfo ?? "—"}</td>
                  <td>
                    <span
                      className="mp-option-stock"
                      style={{ color: statusColor, borderColor: statusColor }}
                    >
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
