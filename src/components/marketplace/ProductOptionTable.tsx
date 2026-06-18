import Image from "next/image";
import { isValidImageSrc } from "@/lib/imagePaths";

type VariantRow = {
  id: string;
  sku: string;
  colorName?: string | null;
  colorCode?: string | null;
  sizeName?: string | null;
  dimensions?: string | null;
  capacity?: string | null;
  stockStatus: string;
  imageUrl?: string | null;
  stockQty?: number | null;
};

const STOCK_LABELS: Record<string, string> = {
  IN_STOCK: "Còn hàng",
  LOW_STOCK: "Sắp hết",
  OUT_OF_STOCK: "Hết hàng",
};

const STOCK_COLORS: Record<string, string> = {
  IN_STOCK: "#16a34a",
  LOW_STOCK: "#d97706",
  OUT_OF_STOCK: "#dc2626",
};

type ProductOptionTableProps = {
  variants: VariantRow[];
};

function VariantCard({ v }: { v: VariantRow }) {
  const sizeInfo = v.sizeName ?? v.capacity ?? v.dimensions;
  const colorInfo = v.colorName;
  const statusLabel = STOCK_LABELS[v.stockStatus] ?? "—";
  const statusColor = STOCK_COLORS[v.stockStatus] ?? "#6b7280";
  const hasImg = v.imageUrl && isValidImageSrc(v.imageUrl);

  return (
    <article className="mp-option-card">
      {hasImg && (
        <div className="mp-option-card-img">
          <Image src={v.imageUrl!} alt="" fill sizes="64px" className="mp-option-card-photo" />
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
          <span className="mp-option-stock" style={{ color: statusColor, borderColor: statusColor }}>
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
    </article>
  );
}

export default function ProductOptionTable({ variants }: ProductOptionTableProps) {
  if (variants.length === 0) return null;

  return (
    <div className="mp-option-table-wrap" id="mp-pdp-options">
      <h2 className="mp-option-table-title">Lựa chọn sản phẩm</h2>
      <p className="mp-option-table-desc">
        Chọn màu sắc, size hoặc quy cách phù hợp với nhu cầu đặt hàng.
      </p>

      <div className="mp-option-cards">
        {variants.map((v) => (
          <VariantCard key={v.id} v={v} />
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
              const sizeInfo = v.sizeName ?? v.capacity ?? v.dimensions;
              const colorInfo = v.colorName;
              const statusLabel = STOCK_LABELS[v.stockStatus] ?? "—";
              const statusColor = STOCK_COLORS[v.stockStatus] ?? "#6b7280";
              const hasImg = v.imageUrl && isValidImageSrc(v.imageUrl);

              return (
                <tr key={v.id}>
                  <td className="mp-option-table-thumb-cell">
                    {hasImg ? (
                      <span className="mp-option-table-thumb">
                        <Image src={v.imageUrl!} alt="" fill sizes="48px" />
                      </span>
                    ) : (
                      <span className="mp-option-table-thumb mp-option-table-thumb--empty" aria-hidden />
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
