"use client";

import Link from "next/link";
import QuoteStatusBadge from "@/components/admin/quotes/QuoteStatusBadge";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import { formatOrderCurrency, formatOrderDate } from "@/features/orders/order-format";
import { formatQuoteCurrency, formatQuoteDate } from "@/features/quotes/format";
import { ITEM_PRODUCTION_RISK_LABELS } from "@/features/item-production-tracking/labels";
import type { CustomerAccountOverview } from "@/features/crm/customer-account-overview.types";

function formatMarginRate(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  // OrderItem.quotedMarginRate is stored as percent points (e.g. 33.33).
  return `${rate.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
}

function formatQty(qty: number, unit: string): string {
  return `${qty.toLocaleString("vi-VN")} ${unit}`.trim();
}

export default function CustomerAccountWorkspace({
  overview,
}: {
  overview: CustomerAccountOverview;
}) {
  const { capabilities, kpis } = overview;

  return (
    <div className="admin-customer-360">
      {(capabilities.includeOrders || capabilities.includeQuotes) && (
        <div className="admin-crm-kpi-grid" aria-label="Tóm tắt thương mại">
          {capabilities.includeOrders && (
            <div className="admin-dashboard-card">
              <span className="admin-field-hint">Tổng đơn hàng</span>
              <strong>{kpis.totalOrders.toLocaleString("vi-VN")}</strong>
            </div>
          )}
          {capabilities.includeOrders && capabilities.includeFinancials && (
            <div className="admin-dashboard-card">
              <span className="admin-field-hint">Giá trị đơn hàng</span>
              <strong>{formatOrderCurrency(kpis.totalOrderValue)}</strong>
            </div>
          )}
          {capabilities.includeQuotes && (
            <div className="admin-dashboard-card">
              <span className="admin-field-hint">Báo giá đang mở</span>
              <strong>{kpis.openQuotations.toLocaleString("vi-VN")}</strong>
            </div>
          )}
          {capabilities.includeOrders && (
            <div className="admin-dashboard-card">
              <span className="admin-field-hint">Đơn đang hoạt động</span>
              <strong>{kpis.activeOrders.toLocaleString("vi-VN")}</strong>
            </div>
          )}
          {capabilities.includeOrders && (
            <div className="admin-dashboard-card">
              <span className="admin-field-hint">Đơn gần nhất</span>
              <strong>{formatOrderDate(kpis.lastOrderDate)}</strong>
            </div>
          )}
        </div>
      )}

      <div className="admin-crm-placeholder-grid">
        {capabilities.includeQuotes ? (
          <section className="admin-section-card">
            <div className="admin-section-header">
              <h3>Báo giá đang xử lý</h3>
              {capabilities.canCreateQuote && (
                <Link
                  href={`/admin/quotes/new?customerId=${overview.customerId}`}
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                >
                  Tạo báo giá
                </Link>
              )}
            </div>
            {overview.openQuotes.length === 0 ? (
              <p className="admin-empty-hint">Không có báo giá đang xử lý.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Mã BG</th>
                      <th>Ngày</th>
                      <th>Liên hệ</th>
                      <th>Trạng thái</th>
                      {capabilities.includeFinancials && <th>Tổng</th>}
                      <th>Hiệu lực</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {overview.openQuotes.map((q) => (
                      <tr key={q.id}>
                        <td>
                          <Link href={`/admin/quotes/${q.id}`}>{q.quoteNo}</Link>
                        </td>
                        <td>{formatQuoteDate(q.quoteDate)}</td>
                        <td>{q.contactName ?? "—"}</td>
                        <td>
                          <QuoteStatusBadge status={q.status} />
                        </td>
                        {capabilities.includeFinancials && (
                          <td>{formatQuoteCurrency(q.totalAmount)}</td>
                        )}
                        <td>{formatQuoteDate(q.validUntil)}</td>
                        <td>
                          <Link
                            href={`/admin/quotes/${q.id}`}
                            className="admin-btn admin-btn--secondary admin-btn--xs"
                          >
                            Mở báo giá
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="admin-section-card">
            <h3>Báo giá đang xử lý</h3>
            <p className="admin-empty-hint">Bạn không có quyền xem báo giá.</p>
          </section>
        )}

        {capabilities.includeOrders ? (
          <section className="admin-section-card">
            <div className="admin-section-header">
              <h3>Đơn hàng</h3>
              {overview.ordersTotalCount > overview.orders.length && (
                <Link
                  href={`/admin/orders?customerId=${encodeURIComponent(overview.customerId)}`}
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                >
                  Xem tất cả ({overview.ordersTotalCount})
                </Link>
              )}
            </div>
            {overview.orders.length === 0 ? (
              <p className="admin-empty-hint">Chưa có đơn hàng.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Báo giá nguồn</th>
                      <th>Ngày</th>
                      <th>Trạng thái</th>
                      {capabilities.includeFinancials && <th>Tổng</th>}
                      {capabilities.includeProduction && <th>Sản xuất</th>}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {overview.orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/admin/orders/${o.id}`}>{o.orderNo}</Link>
                        </td>
                        <td>{o.sourceQuoteNo ?? "—"}</td>
                        <td>{formatOrderDate(o.orderDate)}</td>
                        <td>
                          <OrderStatusBadge status={o.status} />
                        </td>
                        {capabilities.includeFinancials && (
                          <td>{formatOrderCurrency(o.totalAmount)}</td>
                        )}
                        {capabilities.includeProduction && (
                          <td className="admin-field-hint">{o.productionSummary ?? "—"}</td>
                        )}
                        <td>
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="admin-btn admin-btn--secondary admin-btn--xs"
                          >
                            Mở đơn hàng
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="admin-section-card">
            <h3>Đơn hàng</h3>
            <p className="admin-empty-hint">Bạn không có quyền xem đơn hàng.</p>
          </section>
        )}
      </div>

      {capabilities.includeOrders && capabilities.includeProduction && (
        <section className="admin-section-card">
          <div className="admin-section-header">
            <h3>Sản xuất đang chạy</h3>
            <Link href="/admin/production" className="admin-btn admin-btn--secondary admin-btn--xs">
              Mở vận hành sản xuất
            </Link>
          </div>
          {overview.activeProduction.length === 0 ? (
            <p className="admin-empty-hint">Không có item sản xuất đang hoạt động.</p>
          ) : (
            <ul className="admin-customer-360-production-list">
              {overview.activeProduction.map((row) => (
                <li key={`${row.orderId}-${row.orderItemId}`} className="admin-customer-360-production-item">
                  <div>
                    <Link href={`/admin/orders/${row.orderId}`}>
                      <strong>{row.orderNo}</strong>
                    </Link>
                    <p className="admin-field-hint">
                      {row.productName} — {formatQty(row.quantity, row.unit)}
                    </p>
                    <p className="admin-field-hint">
                      {Math.round(row.progressPercent)}%
                      {row.supplierName ? ` · ${row.supplierName}` : ""}
                      {` · Risk: ${ITEM_PRODUCTION_RISK_LABELS[row.riskStatus]}`}
                    </p>
                    {(row.nextAction || row.nextActionDueDate) && (
                      <p className="admin-field-hint">
                        Next: {row.nextAction ?? "—"}
                        {row.nextActionDueDate
                          ? ` — ${formatOrderDate(row.nextActionDueDate)}`
                          : ""}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/admin/orders/${row.orderId}`}
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                  >
                    Mở đơn
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {capabilities.includeOrders && (
        <section className="admin-section-card">
          <h3>Sản phẩm đã mua</h3>
          {overview.purchasedProducts.length === 0 ? (
            <p className="admin-empty-hint">Chưa có lịch sử mua hàng từ đơn (không hủy).</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Biến thể / SKU</th>
                    <th>Đơn gần nhất</th>
                    <th>Ngày</th>
                    <th>SL gần nhất</th>
                    {capabilities.includeFinancials && (
                      <>
                        <th>Giá bán gần nhất</th>
                        <th>Giá vốn báo giá gần nhất</th>
                        <th>Biên lợi nhuận báo giá</th>
                      </>
                    )}
                    <th>Số đơn</th>
                    <th>NCC gần nhất</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {overview.purchasedProducts.map((p) => (
                    <tr key={p.groupKey}>
                      <td>
                        {p.productId ? (
                          <Link href={`/admin/products/${p.productId}/edit`}>{p.productName}</Link>
                        ) : (
                          p.productName
                        )}
                      </td>
                      <td>
                        {[p.variantName, p.sku].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td>
                        <Link href={`/admin/orders/${p.lastOrderId}`}>{p.lastOrderNo}</Link>
                      </td>
                      <td>{formatOrderDate(p.lastOrderDate)}</td>
                      <td>{formatQty(p.lastQuantity, p.lastUnit)}</td>
                      {capabilities.includeFinancials && (
                        <>
                          <td>{formatOrderCurrency(p.lastUnitPrice)}</td>
                          <td>{formatOrderCurrency(p.lastQuotedUnitCost)}</td>
                          <td>{formatMarginRate(p.lastQuotedMarginRate)}</td>
                        </>
                      )}
                      <td>{p.orderCount}</td>
                      <td>{p.lastSupplierName ?? "—"}</td>
                      <td>
                        <Link
                          href={`/admin/orders/${p.lastOrderId}`}
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                        >
                          Xem đơn gần nhất
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
