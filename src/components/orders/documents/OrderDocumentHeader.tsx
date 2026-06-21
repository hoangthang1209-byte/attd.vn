import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import { ORDER_DOCUMENT_TITLES } from "@/features/orders/order-document-types";
import type { OrderDocumentData } from "@/features/orders/order-document-types";
import { formatOrderDate } from "@/features/orders/order-format";

type Props = {
  document: OrderDocumentData;
  company: QuoteCompanyProfile;
  logoUrl?: string | null;
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <p className="order-doc__meta-row">
      <span className="order-doc__meta-label">{label}:</span> {value}
    </p>
  );
}

export default function OrderDocumentHeader({ document, company, logoUrl }: Props) {
  return (
    <>
      <header className="order-doc__header">
        <div className="order-doc__header-left">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={company.brandName} className="order-doc__logo" />
          ) : null}
        </div>
        <div className="order-doc__header-center">
          <h1 className="order-doc__title">{ORDER_DOCUMENT_TITLES[document.docType]}</h1>
        </div>
        <div className="order-doc__header-right">
          <p className="order-doc__company-name">{company.legalName || company.brandName}</p>
          <p className="order-doc__company-line">{company.address}</p>
          <p className="order-doc__company-line">
            {company.phone ? `Tel: ${company.phone}` : null}
            {company.email ? ` · ${company.email}` : null}
          </p>
          {company.taxCode ? (
            <p className="order-doc__company-line">MST: {company.taxCode}</p>
          ) : null}
        </div>
      </header>

      <div className="order-doc__meta-grid">
        <div>
          <Field label="Số đơn hàng" value={document.orderNo} />
          <Field label="Ngày đơn hàng" value={formatOrderDate(document.orderDate)} />
          {document.sourceQuoteNo ? (
            <Field label="Báo giá nguồn" value={document.sourceQuoteNo} />
          ) : null}
          {document.docType === "production" ? (
            <>
              <Field label="Trạng thái SX" value={document.statusLabel} />
              <Field
                label="Hạn sản xuất"
                value={formatOrderDate(document.productionDueDate)}
              />
              <Field label="Phụ trách SX" value={document.productionOwnerName} />
            </>
          ) : null}
          {document.docType === "delivery" ? (
            <>
              <Field label="Phương thức giao" value={document.deliveryMethodName} />
              <Field label="Đơn vị VC" value={document.deliveryCarrierName} />
              <Field label="Mã vận đơn" value={document.deliveryTrackingCode} />
              <Field
                label="Ngày giao dự kiến"
                value={formatOrderDate(document.deliveryExpectedAt)}
              />
              <Field
                label="Ngày giao thực tế"
                value={formatOrderDate(document.deliveredAt ?? document.shippedAt)}
              />
              <Field label="Phụ trách giao" value={document.deliveryOwnerName} />
            </>
          ) : null}
        </div>
        <div>
          <Field label="Khách hàng" value={document.customerCompanyName} />
          <Field label="Mã KH" value={document.customerCode} />
          <Field label="Địa chỉ" value={document.customerAddress} />
          {document.docType === "delivery" ? (
            <>
              <Field label="Người nhận" value={document.deliveryRecipientName} />
              <Field label="SĐT nhận" value={document.deliveryRecipientPhone} />
              <Field label="Địa chỉ giao" value={document.deliveryAddress} />
            </>
          ) : (
            <>
              <Field label="Liên hệ" value={document.contactName} />
              <Field label="Chức vụ" value={document.contactTitle} />
              <Field label="SĐT" value={document.contactPhone} />
              <Field label="Email" value={document.contactEmail} />
            </>
          )}
        </div>
        <div>
          <Field label="Tư vấn bán hàng" value={document.salesName} />
          <Field label="Chức vụ" value={document.salesTitle} />
          <Field label="SĐT" value={document.salesPhone} />
          <Field label="Email" value={document.salesEmail} />
        </div>
      </div>
    </>
  );
}
