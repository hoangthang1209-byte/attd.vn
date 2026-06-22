import { formatOrderDateTime } from "@/features/orders/order-format";
import type { ProductionSheetPdfData } from "@/features/orders/production-sheet/production-sheet.types";

type Props = {
  data: ProductionSheetPdfData;
};

export default function ProductionSheetExecutionSummary({ data }: Props) {
  const summary = data.executionSummary;
  if (!summary) return null;

  return (
    <section className="production-sheet-section production-sheet-execution">
      <h2 className="production-sheet-section__title">Tiến độ sản xuất &amp; QC</h2>
      <table className="production-sheet-meta-table">
        <tbody>
          <tr>
            <th>Công đoạn</th>
            <td>{summary.stageProgressLabel}</td>
          </tr>
          <tr>
            <th>QC</th>
            <td>
              {summary.qcStatusLabel} — Đạt: {summary.qcPassedQuantity} / Kiểm tra: {summary.qcInspectedQuantity}
            </td>
          </tr>
          <tr>
            <th>Đóng gói</th>
            <td>{summary.packingLabel}</td>
          </tr>
          <tr>
            <th>Bàn giao</th>
            <td>{summary.handoverStateLabel}</td>
          </tr>
        </tbody>
      </table>
      {summary.evidenceThumbnails.length > 0 && (
        <div className="production-sheet-evidence-thumbs">
          <p className="production-sheet-section__subtitle">Minh chứng QC (ảnh)</p>
          <div className="production-sheet-evidence-thumbs__grid">
            {summary.evidenceThumbnails.map((thumb) => (
              <figure key={`${thumb.url}-${thumb.title}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb.url} alt={thumb.title} />
                <figcaption>{thumb.title}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
