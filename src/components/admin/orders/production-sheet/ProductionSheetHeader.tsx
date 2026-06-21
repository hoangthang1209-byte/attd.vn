import { formatOrderDate, formatOrderDateTime } from "@/features/orders/order-format";
import type { ProductionSheetPdfData } from "@/features/orders/production-sheet/production-sheet.types";

type Props = {
  data: ProductionSheetPdfData;
};

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <p className="production-sheet-meta-row">
      <span className="production-sheet-meta-label">{label}:</span> {value}
    </p>
  );
}

export default function ProductionSheetHeader({ data }: Props) {
  return (
    <header className="production-sheet-header">
      <div className="production-sheet-header__left">
        {data.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.logoUrl} alt={data.company.brandName} className="production-sheet-logo" />
        ) : null}
      </div>
      <div className="production-sheet-header__center">
        <h1 className="production-sheet-title">LỆNH SẢN XUẤT</h1>
        <p className="production-sheet-subtitle">Bộ hồ sơ sản xuất nội bộ</p>
      </div>
      <div className="production-sheet-header__right">
        <p className="production-sheet-company-name">
          {data.company.legalName || data.company.brandName}
        </p>
        {data.company.address ? (
          <p className="production-sheet-company-line">{data.company.address}</p>
        ) : null}
        <p className="production-sheet-company-line">
          {[data.company.phone ? `Tel: ${data.company.phone}` : null, data.company.email]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="production-sheet-header__meta">
        <div>
          <MetaRow label="Mã đơn hàng" value={data.orderNo} />
          <MetaRow label="Báo giá nguồn" value={data.sourceQuoteNo} />
          <MetaRow label="Ngày lập lệnh" value={formatOrderDate(data.issuedAt)} />
          <MetaRow label="Ngày đặt hàng" value={formatOrderDate(data.orderDate)} />
        </div>
        <div>
          <MetaRow label="Khách hàng" value={data.customerCompanyName} />
          <MetaRow
            label="Nhân viên kinh doanh"
            value={
              data.salesName
                ? [data.salesName, data.salesTitle].filter(Boolean).join(" · ")
                : null
            }
          />
          <MetaRow
            label="Người phụ trách sản xuất"
            value={data.productionOwnerName ?? "Chưa phân công"}
          />
          <MetaRow
            label="Hạn hoàn thành"
            value={
              data.productionDueDate
                ? formatOrderDate(data.productionDueDate)
                : "Chưa có hạn hoàn thành"
            }
          />
          <p className="production-sheet-meta-row">
            <span className="production-sheet-meta-label">Trạng thái:</span>{" "}
            <span className="production-sheet-status-badge">{data.statusLabel}</span>
          </p>
        </div>
      </div>
    </header>
  );
}

export function ProductionSheetOverview({ data }: Props) {
  return (
    <section className="production-sheet-section">
      <h2 className="production-sheet-section__title">THÔNG TIN SẢN XUẤT</h2>
      <div className="production-sheet-overview-grid">
        <MetaRow label="Mã đơn hàng" value={data.orderNo} />
        <MetaRow label="Khách hàng" value={data.customerCompanyName} />
        <MetaRow
          label="Nhân viên kinh doanh"
          value={data.salesName ? [data.salesName, data.salesTitle].filter(Boolean).join(" · ") : null}
        />
        <MetaRow
          label="Người phụ trách sản xuất"
          value={data.productionOwnerName ?? "Chưa phân công"}
        />
        <MetaRow
          label="Hạn hoàn thành"
          value={
            data.productionDueDate
              ? formatOrderDate(data.productionDueDate)
              : "Chưa có hạn hoàn thành"
          }
        />
        <MetaRow label="Trạng thái sản xuất" value={data.statusLabel} />
      </div>
      {data.productionNote ? (
        <div className="production-sheet-note-block">
          <strong>Ghi chú sản xuất:</strong>
          <p>{data.productionNote}</p>
        </div>
      ) : null}
    </section>
  );
}

export function ProductionSheetFooter({ data }: Props) {
  return (
    <footer className="production-sheet-footer">
      <div className="production-sheet-footer__meta">
        <p>Ngày in: {formatOrderDateTime(data.printedAt)}</p>
        <p>Người phụ trách sản xuất: {data.productionOwnerName ?? "—"}</p>
      </div>
      <div className="production-sheet-signatures">
        {["Người lập", "Sản xuất", "Kho nguyên phụ liệu", "QC"].map((label) => (
          <div key={label} className="production-sheet-signature">
            <p className="production-sheet-signature__label">{label}</p>
            <div className="production-sheet-signature__line" />
          </div>
        ))}
      </div>
    </footer>
  );
}
