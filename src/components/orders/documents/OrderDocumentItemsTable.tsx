import type { OrderConfirmationDocument } from "@/features/orders/order-document-types";
import { formatOrderCurrency } from "@/features/orders/order-format";
import { resolveAbsoluteMediaUrl } from "@/features/quotes/resolve-absolute-media-url";

type Props = {
  document: OrderConfirmationDocument;
  mediaBaseUrl?: string;
};

function formatLeadTime(value: string | null): string {
  if (!value?.trim()) return "—";
  if (/^\d+(\.\d+)?$/.test(value.trim())) return `${value.trim()} ngày`;
  return value.trim();
}

export default function OrderDocumentItemsTable({ document, mediaBaseUrl }: Props) {
  return (
    <div className="order-doc__table-wrap">
      <table className="order-doc__table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Thiết kế</th>
            <th>Sản phẩm</th>
            <th>SKU</th>
            <th>Mô tả</th>
            <th>Biến thể</th>
            <th>SL</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
            <th>Thời gian SX</th>
          </tr>
        </thead>
        <tbody>
          {document.items.map((item, index) => {
            const designUrl = resolveAbsoluteMediaUrl(item.designImageUrl, mediaBaseUrl);
            return (
              <tr key={index}>
                <td className="order-doc__cell-center">{index + 1}</td>
                <td className="order-doc__cell-design">
                  {designUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={designUrl} alt="" className="order-doc__design-thumb" />
                  ) : (
                    "—"
                  )}
                </td>
                <td>{item.productName}</td>
                <td>{item.sku ?? "—"}</td>
                <td>{item.description ?? "—"}</td>
                <td className="order-doc__cell-variants">
                  <table className="order-doc__variant-mini">
                    <thead>
                      <tr>
                        <th>Màu</th>
                        <th>Size</th>
                        <th>SL</th>
                        <th>SKU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.variants.map((variant, variantIndex) => (
                        <tr key={variantIndex}>
                          <td>{variant.color ?? "—"}</td>
                          <td>{variant.size ?? "—"}</td>
                          <td>{variant.quantity}</td>
                          <td>{variant.sku ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
                <td className="order-doc__cell-center">{item.quantity}</td>
                <td className="order-doc__cell-money">
                  {formatOrderCurrency(item.unitPrice, document.currency)}
                </td>
                <td className="order-doc__cell-money">
                  {formatOrderCurrency(item.lineTotal, document.currency)}
                </td>
                <td className="order-doc__cell-center">
                  {formatLeadTime(item.productionLeadTime)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
