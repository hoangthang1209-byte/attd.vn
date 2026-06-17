type VariantRow = {
  id: string;
  sku: string;
  colorName?: string | null;
  colorCode?: string | null;
  sizeName?: string | null;
  dimensions?: string | null;
  capacity?: string | null;
  stockStatus: string;
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

export default function ProductOptionTable({ variants }: ProductOptionTableProps) {
  if (variants.length === 0) return null;

  return (
    <div className="mp-option-table-wrap">
      <h2 className="mp-option-table-title">Lựa chọn sản phẩm</h2>
      <p className="mp-option-table-desc">
        Báo giá sỉ theo từng lựa chọn màu/size — liên hệ ATTD để nhận báo giá chi
        tiết theo số lượng và yêu cầu gia công.
      </p>
      <div className="mp-option-table-scroll">
        <table className="mp-option-table">
          <thead>
            <tr>
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

              return (
                <tr key={v.id}>
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
