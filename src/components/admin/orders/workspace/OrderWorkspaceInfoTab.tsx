"use client";

import Link from "next/link";
import ProductionOwnerSelect from "@/components/admin/orders/ProductionOwnerSelect";
import { formatOrderDate, formatOrderDateTime } from "@/features/orders/order-format";
import { ORDER_STATUS_LABELS } from "@/features/orders/order-labels";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import type { EmployeeRecord } from "@/features/employees/employee.service";

type ProductionFields = {
  productionOwnerId: string;
  productionDueDate: string;
  productionNote: string;
};

type Props = {
  order: OrderDetailRecord;
  canViewFinancials: boolean;
  canEditOrder: boolean;
  busy: boolean;
  productionFields: ProductionFields;
  productionEmployees: EmployeeRecord[];
  onProductionFieldsChange: (fields: ProductionFields) => void;
  onProductionEmployeesChange: (employees: EmployeeRecord[]) => void;
  onSaveProduction: (e: React.FormEvent) => void;
  onProductionEmployeeCreated: (employee: EmployeeRecord) => void;
};

export default function OrderWorkspaceInfoTab({
  order,
  canViewFinancials,
  canEditOrder,
  busy,
  productionFields,
  productionEmployees,
  onProductionFieldsChange,
  onProductionEmployeesChange,
  onSaveProduction,
  onProductionEmployeeCreated,
}: Props) {
  const sections = [
    {
      title: "Thông tin khách hàng",
      defaultOpen: false,
      content: (
        <>
          <p>{order.customerCompanyName ?? "—"}</p>
          {order.customerCode && <p className="admin-field-hint">Mã: {order.customerCode}</p>}
          {order.contactName && (
            <p className="admin-field-hint">
              Liên hệ: {order.contactName}
              {order.contactTitle ? ` · ${order.contactTitle}` : ""}
            </p>
          )}
          {order.contactPhone && <p className="admin-field-hint">SĐT: {order.contactPhone}</p>}
          {order.contactEmail && <p className="admin-field-hint">Email: {order.contactEmail}</p>}
          {order.customer && (
            <Link href={`/admin/crm/customers/${order.customer.id}`} className="order-workspace-summary-card__link">
              Mở Customer 360
            </Link>
          )}
        </>
      ),
    },
    {
      title: "Địa chỉ giao hàng",
      defaultOpen: false,
      content: (
        <>
          <p>{order.deliveryRecipientName ?? order.contactName ?? "—"}</p>
          <p className="admin-field-hint">{order.deliveryRecipientPhone ?? order.contactPhone ?? "—"}</p>
          <p className="admin-field-hint">{order.deliveryAddress ?? order.customerAddress ?? "—"}</p>
        </>
      ),
    },
    {
      title: "Thông tin pháp lý",
      defaultOpen: false,
      content: canViewFinancials ? (
        <>
          {order.customerLegalNameSnapshot && <p>{order.customerLegalNameSnapshot}</p>}
          {order.customerTaxCode && <p className="admin-field-hint">MST: {order.customerTaxCode}</p>}
          {order.customerAddress && <p className="admin-field-hint">{order.customerAddress}</p>}
        </>
      ) : (
        <p className="admin-field-hint">Không có quyền xem thông tin pháp lý.</p>
      ),
    },
    {
      title: "Điều khoản đơn hàng",
      defaultOpen: false,
      content: order.terms ? (
        <pre className="admin-field-hint" style={{ whiteSpace: "pre-wrap" }}>{order.terms}</pre>
      ) : (
        <p className="admin-field-hint">—</p>
      ),
    },
    {
      title: "Nguồn đơn",
      defaultOpen: false,
      content: (
        <>
          <p className="admin-field-hint">
            {order.sourceQuoteNo
              ? canViewFinancials && order.quote
                ? <>Báo giá: <Link href={`/admin/quotes/${order.quote.id}`}>{order.sourceQuoteNo}</Link></>
                : `Báo giá: ${order.sourceQuoteNo}`
              : "Tạo trực tiếp"}
          </p>
          {order.sourceQuoteDate && (
            <p className="admin-field-hint">Ngày báo giá: {formatOrderDate(order.sourceQuoteDate)}</p>
          )}
        </>
      ),
    },
    {
      title: "Ghi chú sales",
      defaultOpen: false,
      content: order.customerNote ? (
        <pre className="admin-field-hint" style={{ whiteSpace: "pre-wrap" }}>{order.customerNote}</pre>
      ) : (
        <p className="admin-field-hint">—</p>
      ),
    },
    {
      title: "Phân công sản xuất",
      defaultOpen: false,
      content: canEditOrder ? (
        <form onSubmit={onSaveProduction}>
          <div className="admin-catalog-variant-fields">
            <div className="admin-field">
              <label className="admin-label">Người phụ trách sản xuất</label>
              <ProductionOwnerSelect
                value={productionFields.productionOwnerId}
                onChange={(productionOwnerId) =>
                  onProductionFieldsChange({ ...productionFields, productionOwnerId })
                }
                employees={productionEmployees}
                onEmployeesChange={onProductionEmployeesChange}
                legacyOwnerName={
                  !order.productionOwnerId && order.productionOwnerName ? order.productionOwnerName : null
                }
                disabled={busy}
                onEmployeeCreated={onProductionEmployeeCreated}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Hạn hoàn thành dự kiến</label>
              <input
                className="admin-input"
                type="date"
                value={productionFields.productionDueDate}
                onChange={(e) =>
                  onProductionFieldsChange({ ...productionFields, productionDueDate: e.target.value })
                }
              />
            </div>
            <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
              <label className="admin-label">Ghi chú sản xuất</label>
              <textarea
                className="admin-textarea"
                rows={3}
                value={productionFields.productionNote}
                onChange={(e) =>
                  onProductionFieldsChange({ ...productionFields, productionNote: e.target.value })
                }
              />
            </div>
          </div>
          <button type="submit" className="admin-btn admin-btn--primary admin-btn--small" disabled={busy}>
            Lưu thông tin sản xuất
          </button>
        </form>
      ) : (
        <>
          <p className="admin-field-hint">Phụ trách SX: {order.productionOwnerName ?? "—"}</p>
          <p className="admin-field-hint">
            Hạn hoàn thành: {order.productionDueDate ? formatOrderDate(order.productionDueDate) : "—"}
          </p>
          {order.productionNote && (
            <pre className="admin-field-hint" style={{ whiteSpace: "pre-wrap" }}>{order.productionNote}</pre>
          )}
        </>
      ),
    },
    {
      title: "Chi tiết đơn",
      defaultOpen: true,
      content: (
        <>
          <p className="admin-field-hint">Ngày đơn: {formatOrderDate(order.orderDate)}</p>
          <p className="admin-field-hint">Trạng thái: <strong>{ORDER_STATUS_LABELS[order.status]}</strong></p>
          {order.salesName && (
            <p className="admin-field-hint">
              Tư vấn: {order.salesName}
              {order.salesTitle ? ` · ${order.salesTitle}` : ""}
            </p>
          )}
          {order.productionStartedAt && (
            <p className="admin-field-hint">Bắt đầu SX: {formatOrderDateTime(order.productionStartedAt)}</p>
          )}
          {order.readyToShipAt && (
            <p className="admin-field-hint">Sẵn sàng giao: {formatOrderDateTime(order.readyToShipAt)}</p>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="order-workspace-info-tab">
      {sections.map((section) => (
        <details key={section.title} className="order-workspace-details" open={section.defaultOpen}>
          <summary>{section.title}</summary>
          <div className="order-workspace-details__body">{section.content}</div>
        </details>
      ))}
    </div>
  );
}
