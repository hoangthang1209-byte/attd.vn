import type { ProductionSheetVariantRow } from "@/features/orders/production-sheet/production-sheet.types";

type Props = {
  rows: ProductionSheetVariantRow[];
};

export default function ProductionSheetVariantsTable({ rows }: Props) {
  return (
    <section className="production-sheet-section">
      <h2 className="production-sheet-section__title">DANH SÁCH SẢN XUẤT</h2>
      {rows.length === 0 ? (
        <p className="production-sheet-empty">Không có dòng sản xuất.</p>
      ) : (
        <table className="production-sheet-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Hình thiết kế</th>
              <th>Sản phẩm</th>
              <th>Màu</th>
              <th>Size</th>
              <th>SKU</th>
              <th>Số lượng</th>
              <th>Đơn vị</th>
              <th>Ghi chú sản xuất</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.stt} className="production-sheet-table__row">
                <td>{row.stt}</td>
                <td className="production-sheet-table__design">
                  {row.designImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.designImageUrl}
                      alt=""
                      className="production-sheet-design-thumb"
                    />
                  ) : (
                    <span className="production-sheet-placeholder">Chưa có ảnh thiết kế</span>
                  )}
                </td>
                <td>{row.productName}</td>
                <td>{row.color ?? "—"}</td>
                <td>{row.size ?? "—"}</td>
                <td>{row.sku ?? "—"}</td>
                <td>{row.quantity.toLocaleString("vi-VN")}</td>
                <td>{row.unit}</td>
                <td>{row.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
