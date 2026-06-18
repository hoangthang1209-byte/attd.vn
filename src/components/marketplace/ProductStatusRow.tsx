type ProductStatusRowProps = {
  stockLabel?: string | null;
  stockColor?: string;
  skuCount?: number;
};

export default function ProductStatusRow({
  stockLabel,
  stockColor = "#16a34a",
  skuCount = 0,
}: ProductStatusRowProps) {
  return (
    <div className="mp-pdp-status-row">
      {stockLabel && (
        <span className="mp-pdp-status-item">
          <span className="mp-pdp-status-label">Tình trạng hàng</span>
          <span className="mp-pdp-status-value" style={{ color: stockColor }}>
            {stockLabel}
          </span>
        </span>
      )}
      {skuCount > 0 && (
        <span className="mp-pdp-status-item">
          <span className="mp-pdp-status-label">Số lựa chọn sản phẩm</span>
          <span className="mp-pdp-status-value">{skuCount}</span>
        </span>
      )}
      <span className="mp-pdp-status-item mp-pdp-status-item--ready">
        <span className="mp-pdp-status-label">Báo giá</span>
        <span className="mp-pdp-status-value mp-pdp-status-value--ready">
          Đã sẵn sàng báo giá
        </span>
      </span>
    </div>
  );
}
