"use client";

import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import DeliveryCarrierSelect from "@/components/admin/orders/DeliveryCarrierSelect";
import OrderDeliveryExecutionSection from "@/components/admin/orders/OrderDeliveryExecutionSection";
import { formatOrderDate, formatOrderDateTime } from "@/features/orders/order-format";
import type { DeliveryCarrierRecord } from "@/features/delivery/delivery-carrier.service";
import type { DeliveryMethodRecord } from "@/features/delivery/delivery-method.service";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import { orderCarrierDisplay } from "@/features/orders/order-status";
import type { EmployeeRecord } from "@/features/employees/employee.service";

type DeliveryFields = {
  deliveryMethodId: string;
  deliveryOwnerId: string;
  deliveryCarrierId: string;
  deliveryTrackingCode: string;
  deliveryRecipientName: string;
  deliveryRecipientPhone: string;
  deliveryAddress: string;
  deliveryExpectedAt: string;
  deliveryNote: string;
};

type Props = {
  orderId: string;
  order: OrderDetailRecord;
  showDeliveryForm: boolean;
  canEditOrder: boolean;
  busy: boolean;
  deliveryFields: DeliveryFields;
  deliveryMethods: DeliveryMethodRecord[];
  employees: EmployeeRecord[];
  carriers: DeliveryCarrierRecord[];
  deliveryRefreshKey: number;
  onDeliveryFieldsChange: (fields: DeliveryFields) => void;
  onCarriersChange: (carriers: DeliveryCarrierRecord[]) => void;
  onSaveDelivery: (e: React.FormEvent) => void;
  onCarrierCreated: (carrier: DeliveryCarrierRecord) => void;
  onDeliveryRefresh: () => void;
};

function deliveryMethodDisplay(order: OrderDetailRecord): string {
  return order.deliveryMethodName ?? order.deliveryMethod ?? "—";
}

export default function OrderWorkspaceDeliveryTab({
  orderId,
  order,
  showDeliveryForm,
  canEditOrder,
  busy,
  deliveryFields,
  deliveryMethods,
  employees,
  carriers,
  deliveryRefreshKey,
  onDeliveryFieldsChange,
  onCarriersChange,
  onSaveDelivery,
  onCarrierCreated,
  onDeliveryRefresh,
}: Props) {
  return (
    <div className="order-workspace-delivery-tab">
      <section className="order-workspace-panel-section">
        <h3 className="order-workspace-panel-section__title">Thông tin giao hàng</h3>
        {showDeliveryForm && canEditOrder ? (
          <form onSubmit={onSaveDelivery}>
            <div className="admin-catalog-variant-fields">
              <div className="admin-field">
                <label className="admin-label">Hình thức giao hàng</label>
                <select
                  className="admin-input"
                  value={deliveryFields.deliveryMethodId}
                  onChange={(e) =>
                    onDeliveryFieldsChange({ ...deliveryFields, deliveryMethodId: e.target.value })
                  }
                >
                  <option value="">— Chọn hình thức —</option>
                  {deliveryMethods.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Người phụ trách giao hàng</label>
                <AdminSearchableSelect
                  value={deliveryFields.deliveryOwnerId}
                  onChange={(deliveryOwnerId) =>
                    onDeliveryFieldsChange({ ...deliveryFields, deliveryOwnerId })
                  }
                  options={employees.map((employee) => ({
                    value: employee.id,
                    label: employee.fullName,
                    sublabel: employee.employeeCode,
                  }))}
                  placeholder="— Chọn nhân viên —"
                  searchPlaceholder="Tìm nhân viên phụ trách…"
                  emptyMessage="Chưa có nhân viên đang hoạt động."
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Đơn vị vận chuyển</label>
                <DeliveryCarrierSelect
                  value={deliveryFields.deliveryCarrierId}
                  onChange={(deliveryCarrierId) =>
                    onDeliveryFieldsChange({ ...deliveryFields, deliveryCarrierId })
                  }
                  carriers={carriers}
                  onCarriersChange={onCarriersChange}
                  legacyCarrierName={!order.deliveryCarrierId ? orderCarrierDisplay(order) : null}
                  disabled={busy}
                  onCarrierCreated={onCarrierCreated}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Mã vận đơn</label>
                <input
                  className="admin-input"
                  value={deliveryFields.deliveryTrackingCode}
                  onChange={(e) =>
                    onDeliveryFieldsChange({ ...deliveryFields, deliveryTrackingCode: e.target.value })
                  }
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Người nhận *</label>
                <input
                  className="admin-input"
                  required
                  value={deliveryFields.deliveryRecipientName}
                  onChange={(e) =>
                    onDeliveryFieldsChange({ ...deliveryFields, deliveryRecipientName: e.target.value })
                  }
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Số điện thoại người nhận *</label>
                <input
                  className="admin-input"
                  required
                  value={deliveryFields.deliveryRecipientPhone}
                  onChange={(e) =>
                    onDeliveryFieldsChange({ ...deliveryFields, deliveryRecipientPhone: e.target.value })
                  }
                />
              </div>
              <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
                <label className="admin-label">Địa chỉ giao hàng *</label>
                <textarea
                  className="admin-textarea"
                  rows={2}
                  required
                  value={deliveryFields.deliveryAddress}
                  onChange={(e) =>
                    onDeliveryFieldsChange({ ...deliveryFields, deliveryAddress: e.target.value })
                  }
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Dự kiến giao</label>
                <input
                  className="admin-input"
                  type="date"
                  value={deliveryFields.deliveryExpectedAt}
                  onChange={(e) =>
                    onDeliveryFieldsChange({ ...deliveryFields, deliveryExpectedAt: e.target.value })
                  }
                />
              </div>
              <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
                <label className="admin-label">Ghi chú giao hàng</label>
                <textarea
                  className="admin-textarea"
                  rows={2}
                  value={deliveryFields.deliveryNote}
                  onChange={(e) =>
                    onDeliveryFieldsChange({ ...deliveryFields, deliveryNote: e.target.value })
                  }
                />
              </div>
            </div>
            <button type="submit" className="admin-btn admin-btn--primary admin-btn--small" disabled={busy}>
              Lưu thông tin giao hàng
            </button>
          </form>
        ) : (
          <div className="order-workspace-readonly-grid">
            <p>Hình thức: {deliveryMethodDisplay(order)}</p>
            <p>Phụ trách: {order.deliveryOwnerName ?? "—"}</p>
            <p>Đơn vị VC: {orderCarrierDisplay(order) ?? "—"}</p>
            <p>Mã vận đơn: {order.deliveryTrackingCode ?? "—"}</p>
            <p>Người nhận: {order.deliveryRecipientName ?? "—"}</p>
            <p>SĐT: {order.deliveryRecipientPhone ?? "—"}</p>
            <p>Địa chỉ: {order.deliveryAddress ?? "—"}</p>
            <p>Dự kiến: {order.deliveryExpectedAt ? formatOrderDate(order.deliveryExpectedAt) : "—"}</p>
            <p>Thực tế: {order.deliveredAt ? formatOrderDateTime(order.deliveredAt) : order.shippedAt ? formatOrderDateTime(order.shippedAt) : "—"}</p>
          </div>
        )}
      </section>

      <OrderDeliveryExecutionSection
        orderId={orderId}
        order={order}
        refreshKey={deliveryRefreshKey}
        onRequestShip={onDeliveryRefresh}
      />
    </div>
  );
}
