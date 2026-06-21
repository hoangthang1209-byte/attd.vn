import { formatOrderDateTime } from "@/features/orders/order-format";
import type { ProductionSheetPdfData } from "@/features/orders/production-sheet/production-sheet.types";

const STATUS_LABELS = {
  complete: "Đã đủ",
  incomplete: "Cần bổ sung",
  not_applicable: "Không áp dụng",
} as const;

type Props = {
  data: ProductionSheetPdfData;
};

export default function ProductionSheetReadiness({ data }: Props) {
  return (
    <section className="production-sheet-section production-sheet-readiness">
      <h2 className="production-sheet-section__title">KIỂM TRA SẴN SÀNG SẢN XUẤT</h2>
      <table className="production-sheet-table">
        <thead>
          <tr>
            <th>Hạng mục</th>
            <th>Trạng thái</th>
            <th>Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          {data.readiness.items.map((item) => (
            <tr key={item.key} className={`production-sheet-readiness__row production-sheet-readiness__row--${item.status}`}>
              <td>{item.label}</td>
              <td>
                <span className={`production-sheet-readiness-badge production-sheet-readiness-badge--${item.status}`}>
                  {STATUS_LABELS[item.status]}
                </span>
              </td>
              <td>{item.detail ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.acknowledgement ? (
        <div className="production-sheet-acknowledgement">
          <strong>Đơn hàng đã được cho phép bắt đầu sản xuất khi hồ sơ chưa đầy đủ.</strong>
          <p>Thời điểm: {formatOrderDateTime(data.acknowledgement.acknowledgedAt)}</p>
          {data.acknowledgement.detail ? (
            <pre className="production-sheet-acknowledgement__detail">{data.acknowledgement.detail}</pre>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
