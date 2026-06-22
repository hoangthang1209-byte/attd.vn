import type { DeliveryNoteViewModel } from "@/features/orders/delivery-note/delivery-note.service";

type Props = {
  data: DeliveryNoteViewModel;
  variant?: "screen" | "pdf" | "print";
};

export default function DeliveryNoteDocument({ data, variant = "screen" }: Props) {
  const pdf = variant === "pdf";
  return (
    <div className={`delivery-note-doc${pdf ? " delivery-note-doc--pdf" : ""}`}>
      <header className="delivery-note-doc__header">
        <h1>PHIẾU GIAO HÀNG</h1>
        <p>Mã chuyến: <strong>{data.executionCode}</strong></p>
        <p>Mã đơn hàng: <strong>{data.orderNo}</strong></p>
      </header>

      <section className="delivery-note-doc__meta">
        <p><strong>Người nhận:</strong> {data.recipientName ?? "—"}</p>
        <p><strong>SĐT:</strong> {data.recipientPhone ?? "—"}</p>
        <p><strong>Địa chỉ:</strong> {data.recipientAddress ?? "—"}</p>
        <p><strong>Hình thức giao:</strong> {data.deliveryMethodName ?? "—"}</p>
        <p><strong>Đơn vị vận chuyển:</strong> {data.carrierName ?? "—"}</p>
        <p><strong>Mã vận đơn:</strong> {data.trackingCode ?? "—"}</p>
        <p><strong>Người giao:</strong> {data.assignedEmployeeName ?? "—"}</p>
        <p><strong>Ngày xuất hàng:</strong> {data.dispatchedAt ?? "—"}</p>
        {data.note && <p><strong>Ghi chú:</strong> {data.note}</p>}
      </section>

      <table className="delivery-note-doc__table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Sản phẩm</th>
            <th>Màu</th>
            <th>Size</th>
            <th>SKU</th>
            <th>SL xuất</th>
            <th>ĐVT</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={`${item.productName}-${index}`}>
              <td>{index + 1}</td>
              <td>{item.productName}</td>
              <td>{item.colorName ?? "—"}</td>
              <td>{item.sizeValue ?? "—"}</td>
              <td>{item.sku ?? "—"}</td>
              <td>{item.dispatchedQuantity}</td>
              <td>{item.unit ?? "—"}</td>
              <td>{item.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="delivery-note-doc__signatures">
        <div>
          <p>Người giao</p>
          <div className="delivery-note-doc__sign-line" />
        </div>
        <div>
          <p>Người nhận</p>
          <div className="delivery-note-doc__sign-line" />
        </div>
        <div>
          <p>Ghi chú</p>
          <div className="delivery-note-doc__sign-line" />
        </div>
      </footer>
    </div>
  );
}
