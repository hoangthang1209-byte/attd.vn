import type {
  ProductionSheetItemBom,
  ProductionSheetMaterialSummaryRow,
} from "@/features/orders/production-sheet/production-sheet.types";

type BomProps = {
  itemBoms: ProductionSheetItemBom[];
};

export function ProductionSheetBomTable({ itemBoms }: BomProps) {
  return (
    <section className="production-sheet-section">
      <h2 className="production-sheet-section__title">ĐỊNH MỨC NGUYÊN PHỤ LIỆU THEO SẢN PHẨM</h2>
      {itemBoms.length === 0 ? (
        <p className="production-sheet-empty">Chưa có dữ liệu nguyên phụ liệu cho đơn hàng này.</p>
      ) : (
        itemBoms.map((item) => (
          <div key={item.orderItemId} className="production-sheet-bom-group">
            <h3 className="production-sheet-subsection__title">
              {item.productName}
              <span className="production-sheet-muted"> · {item.totalQuantity.toLocaleString("vi-VN")} sp</span>
            </h3>
            {item.rows.length === 0 ? (
              <p className="production-sheet-warning">Chưa có định mức nguyên phụ liệu</p>
            ) : (
              <table className="production-sheet-table">
                <thead>
                  <tr>
                    <th>Loại</th>
                    <th>Nguyên phụ liệu</th>
                    <th>Mã vật tư</th>
                    <th>Đơn vị</th>
                    <th>Định mức</th>
                    <th>Hao hụt</th>
                    <th>Cần chuẩn bị</th>
                    <th>Có thể dùng</th>
                    <th>Thiếu</th>
                    <th>Trạng thái</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {item.rows.map((row, index) => (
                    <tr key={`${item.orderItemId}-${index}`} className="production-sheet-table__row">
                      <td>{row.materialTypeLabel}</td>
                      <td>{row.materialName}</td>
                      <td>{row.materialCode ?? "—"}</td>
                      <td>{row.unit}</td>
                      <td>{row.consumptionPerUnit}</td>
                      <td>{row.wastagePercent}%</td>
                      <td>
                        {row.requiredQuantity}
                        {row.requiredQuantityOverridden ? (
                          <span className="production-sheet-override"> · Điều chỉnh thủ công</span>
                        ) : null}
                        <div className="production-sheet-formula">{row.formula}</div>
                      </td>
                      <td>{row.availableQuantity ?? "Chưa kiểm tồn"}</td>
                      <td>
                        {row.shortageQuantity
                          ? `Thiếu ${row.shortageQuantity} ${row.unit}`
                          : "—"}
                      </td>
                      <td>{row.readinessLabel ?? "—"}</td>
                      <td>{row.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}
    </section>
  );
}

type SummaryProps = {
  rows: ProductionSheetMaterialSummaryRow[];
};

export function ProductionSheetMaterialSummaryTable({ rows }: SummaryProps) {
  return (
    <section className="production-sheet-section">
      <h2 className="production-sheet-section__title">TỔNG HỢP NGUYÊN PHỤ LIỆU CẦN CHUẨN BỊ</h2>
      {rows.length === 0 ? (
        <p className="production-sheet-warning">Chưa có dữ liệu nguyên phụ liệu cho đơn hàng này.</p>
      ) : (
        <table className="production-sheet-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Loại</th>
              <th>Nguyên phụ liệu</th>
              <th>Mã vật tư</th>
              <th>Đơn vị</th>
              <th>Tổng cần chuẩn bị</th>
              <th>Có thể dùng</th>
              <th>Thiếu</th>
              <th>Trạng thái</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.stt} className="production-sheet-table__row">
                <td>{row.stt}</td>
                <td>{row.materialTypeLabel}</td>
                <td>{row.materialName}</td>
                <td>{row.materialCode ?? "—"}</td>
                <td>{row.unit}</td>
                <td>{row.totalRequiredQuantity}</td>
                <td>{row.availableQuantity ?? "Chưa kiểm tồn"}</td>
                <td>
                  {row.shortageQuantity
                    ? `Thiếu ${row.shortageQuantity} ${row.unit}`
                    : "—"}
                </td>
                <td>{row.readinessLabel}</td>
                <td>{row.notes.length ? row.notes.join("; ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
