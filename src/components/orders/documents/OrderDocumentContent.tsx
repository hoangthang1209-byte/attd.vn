import type { OrderDocumentData } from "@/features/orders/order-document-types";
import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import OrderDocumentShell from "@/components/orders/documents/OrderDocumentShell";
import OrderDocumentHeader from "@/components/orders/documents/OrderDocumentHeader";
import OrderDocumentItemsTable from "@/components/orders/documents/OrderDocumentItemsTable";
import { formatOrderCurrency, formatOrderDate } from "@/features/orders/order-format";
import { resolveAbsoluteMediaUrl } from "@/features/quotes/resolve-absolute-media-url";

type Props = {
  document: OrderDocumentData;
  company: QuoteCompanyProfile;
  logoUrl?: string | null;
  variant?: "screen" | "pdf" | "print";
  mediaBaseUrl?: string;
};

function ProductionTable({
  document,
  mediaBaseUrl,
}: {
  document: Extract<OrderDocumentData, { docType: "production" }>;
  mediaBaseUrl?: string;
}) {
  return (
    <div className="order-doc__table-wrap">
      <table className="order-doc__table">
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
            <th>Mô tả SX</th>
            <th>Thời gian SX</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {document.rows.map((row) => {
            const designUrl = resolveAbsoluteMediaUrl(row.designImageUrl, mediaBaseUrl);
            return (
              <tr key={row.stt}>
                <td className="order-doc__cell-center">{row.stt}</td>
                <td className="order-doc__cell-design order-doc__cell-design--large">
                  {designUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={designUrl} alt="" className="order-doc__design-thumb order-doc__design-thumb--large" />
                  ) : (
                    "—"
                  )}
                </td>
                <td>{row.productName}</td>
                <td>{row.color ?? "—"}</td>
                <td>{row.size ?? "—"}</td>
                <td>{row.sku ?? "—"}</td>
                <td className="order-doc__cell-center">{row.quantity}</td>
                <td className="order-doc__cell-center">{row.unit}</td>
                <td>{row.description ?? "—"}</td>
                <td className="order-doc__cell-center">{row.productionLeadTime ?? "—"}</td>
                <td>{row.note ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeliveryTable({
  document,
}: {
  document: Extract<OrderDocumentData, { docType: "delivery" }>;
}) {
  return (
    <div className="order-doc__table-wrap">
      <table className="order-doc__table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Sản phẩm</th>
            <th>Màu</th>
            <th>Size</th>
            <th>SKU</th>
            <th>Số lượng</th>
            <th>Đơn vị</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {document.rows.map((row) => (
            <tr key={row.stt}>
              <td className="order-doc__cell-center">{row.stt}</td>
              <td>{row.productName}</td>
              <td>{row.color ?? "—"}</td>
              <td>{row.size ?? "—"}</td>
              <td>{row.sku ?? "—"}</td>
              <td className="order-doc__cell-center">{row.quantity}</td>
              <td className="order-doc__cell-center">{row.unit}</td>
              <td>{row.note ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OrderDocumentContent({
  document,
  company,
  logoUrl,
  variant = "screen",
  mediaBaseUrl,
}: Props) {
  const resolvedLogo = resolveAbsoluteMediaUrl(logoUrl, mediaBaseUrl);

  return (
    <OrderDocumentShell variant={variant}>
      <OrderDocumentHeader document={document} company={company} logoUrl={resolvedLogo} />

      {document.docType === "confirmation" ? (
        <>
          <OrderDocumentItemsTable document={document} mediaBaseUrl={mediaBaseUrl} />
          <div className="order-doc__summary">
            <div className="order-doc__summary-block">
              <p>
                <strong>Tổng giá trị đơn hàng:</strong>{" "}
                {formatOrderCurrency(document.totalAmount, document.currency)}
              </p>
              <p>
                <strong>Đã thanh toán:</strong>{" "}
                {formatOrderCurrency(document.paidAmount, document.currency)}
              </p>
              <p>
                <strong>Còn phải thu:</strong>{" "}
                {formatOrderCurrency(document.outstandingAmount, document.currency)}
              </p>
            </div>
            <div className="order-doc__summary-block">
              {document.sampleFee != null ? (
                <p>
                  <strong>Phí mẫu:</strong>{" "}
                  {formatOrderCurrency(document.sampleFee, document.currency)}
                </p>
              ) : null}
              {document.sampleLeadTime ? (
                <p>
                  <strong>Thời gian làm mẫu:</strong> {document.sampleLeadTime}
                </p>
              ) : null}
              {document.sampleRefundCondition ? (
                <p>
                  <strong>Điều kiện hoàn phí:</strong> {document.sampleRefundCondition}
                </p>
              ) : null}
            </div>
          </div>
          {document.customerNote ? (
            <section className="order-doc__notes">
              <h3>Ghi chú khách hàng</h3>
              <p>{document.customerNote}</p>
            </section>
          ) : null}
          {document.terms ? (
            <section className="order-doc__notes">
              <h3>Điều khoản đơn hàng</h3>
              <p>{document.terms}</p>
            </section>
          ) : null}
          {document.preparedBy ? (
            <p className="order-doc__prepared-by">
              Người lập: <strong>{document.preparedBy}</strong>
            </p>
          ) : null}
        </>
      ) : null}

      {document.docType === "production" ? (
        <>
          {document.productionNote ? (
            <section className="order-doc__notes">
              <h3>Ghi chú sản xuất</h3>
              <p>{document.productionNote}</p>
            </section>
          ) : null}
          <ProductionTable document={document} mediaBaseUrl={mediaBaseUrl} />
          <footer className="order-doc__footer-signatures">
            <div>Người lập lệnh: ____________________</div>
            <div>Người phụ trách sản xuất: ____________________</div>
            <div>Ngày in: {formatOrderDate(new Date().toISOString())}</div>
          </footer>
        </>
      ) : null}

      {document.docType === "delivery" ? (
        <>
          {document.deliveryNote ? (
            <section className="order-doc__notes">
              <h3>Ghi chú giao hàng</h3>
              <p>{document.deliveryNote}</p>
            </section>
          ) : null}
          <DeliveryTable document={document} />
          <footer className="order-doc__footer-signatures order-doc__footer-signatures--delivery">
            <div>Người giao: ____________________</div>
            <div>Người nhận: ____________________</div>
            <div>Ghi chú xác nhận: ____________________</div>
          </footer>
        </>
      ) : null}
    </OrderDocumentShell>
  );
}
