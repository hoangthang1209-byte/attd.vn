"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";
import type { DeliveryCarrierRecord } from "@/features/delivery/delivery-carrier.service";
import type { DeliveryMethodRecord } from "@/features/delivery/delivery-method.service";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import OrderWorkspaceHeader from "./OrderWorkspaceHeader";
import OrderWorkspaceSummaryCards from "./OrderWorkspaceSummaryCards";
import OrderProductTable from "./OrderProductTable";
import OrderProductionSummaryPanel from "./OrderProductionSummaryPanel";
import OrderItemProductionPanel from "@/components/admin/item-production/OrderItemProductionPanel";
import OrderWorkspaceInfoTab from "./OrderWorkspaceInfoTab";
import OrderWorkspaceDeliveryTab from "./OrderWorkspaceDeliveryTab";
import OrderWorkspacePaymentTab from "./OrderWorkspacePaymentTab";
import OrderWorkspaceActivityTab from "./OrderWorkspaceActivityTab";
import OrderWorkspaceNotesTab from "./OrderWorkspaceNotesTab";
import OrderWorkspaceLowerSections from "./OrderWorkspaceLowerSections";
import { useOrderWorkspaceData } from "./useOrderWorkspaceData";
import {
  ORDER_WORKSPACE_TABS,
  orderWorkspaceTabStorageKey,
  type OrderWorkspaceTab,
} from "./order-workspace.types";

type ProductionFields = {
  productionOwnerId: string;
  productionDueDate: string;
  productionNote: string;
};

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

export type OrderWorkspaceShellProps = {
  orderId: string;
  order: OrderDetailRecord;
  listBackHref: string;
  busy: boolean;
  canEditOrder: boolean;
  canRecordPayment: boolean;
  showDeliveryForm: boolean;
  transitions: OrderStatus[];
  correctionTargets: OrderStatus[];
  productionFields: ProductionFields;
  deliveryFields: DeliveryFields;
  productionEmployees: EmployeeRecord[];
  employees: EmployeeRecord[];
  deliveryMethods: DeliveryMethodRecord[];
  carriers: DeliveryCarrierRecord[];
  deliveryRefreshKey: number;
  onProductionFieldsChange: (fields: ProductionFields) => void;
  onProductionEmployeesChange: (employees: EmployeeRecord[]) => void;
  onDeliveryFieldsChange: (fields: DeliveryFields) => void;
  onCarriersChange: (carriers: DeliveryCarrierRecord[]) => void;
  onSaveProduction: (e: React.FormEvent) => void;
  onSaveDelivery: (e: React.FormEvent) => void;
  onProductionEmployeeCreated: (employee: EmployeeRecord) => void;
  onCarrierCreated: (carrier: DeliveryCarrierRecord) => void;
  onDeliveryRefresh: () => void;
  onRequestStatusChange: (status: OrderStatus) => void;
  onOpenCancel: () => void;
  onOpenCorrection: (status: OrderStatus) => void;
  onOpenRecordPayment: () => void;
  onOpenEditPayment: (paymentId: string) => void;
  onOpenVoidPayment: (paymentId: string) => void;
};

function defaultTabForRole(roleCode: string | null): OrderWorkspaceTab {
  if (roleCode === "DELIVERY") return "delivery";
  return "products";
}

export default function OrderWorkspaceShell(props: OrderWorkspaceShellProps) {
  const { permissions, roleCode } = useAdminPermissions();
  const canViewFinancials = permissions.canViewFinancials;
  const canViewProduction = permissions.canViewProduction;

  const {
    orderId,
    order,
    busy,
    canEditOrder,
    canRecordPayment,
    showDeliveryForm,
    transitions,
    correctionTargets,
    productionFields,
    deliveryFields,
    productionEmployees,
    employees,
    deliveryMethods,
    carriers,
    deliveryRefreshKey,
    onProductionFieldsChange,
    onProductionEmployeesChange,
    onDeliveryFieldsChange,
    onCarriersChange,
    onSaveProduction,
    onSaveDelivery,
    onProductionEmployeeCreated,
    onCarrierCreated,
    onDeliveryRefresh,
    onRequestStatusChange,
    onOpenCancel,
    onOpenCorrection,
    onOpenRecordPayment,
    onOpenEditPayment,
    onOpenVoidPayment,
  } = props;

  const workspaceData = useOrderWorkspaceData(orderId);
  const tabStorageKey = orderWorkspaceTabStorageKey(orderId);

  const visibleTabs = useMemo(
    () => ORDER_WORKSPACE_TABS.filter((tab) => !tab.financialOnly || canViewFinancials),
    [canViewFinancials],
  );

  const [activeTab, setActiveTab] = useState<OrderWorkspaceTab>(defaultTabForRole(roleCode));

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(tabStorageKey) as OrderWorkspaceTab | null;
      if (stored && visibleTabs.some((t) => t.key === stored)) {
        setActiveTab(stored);
        return;
      }
    } catch {
      /* ignore */
    }
    setActiveTab(defaultTabForRole(roleCode));
  }, [orderId, roleCode, tabStorageKey, visibleTabs]);

  const navigateTab = useCallback(
    (tab: OrderWorkspaceTab) => {
      if (!visibleTabs.some((t) => t.key === tab)) return;
      setActiveTab(tab);
      try {
        sessionStorage.setItem(tabStorageKey, tab);
      } catch {
        /* ignore */
      }
    },
    [tabStorageKey, visibleTabs],
  );

  return (
    <div className="order-workspace">
      <nav className="order-workspace-breadcrumb" aria-label="Breadcrumb">
        <Link href="/admin/orders">Đơn hàng</Link>
        <span aria-hidden>›</span>
        <span>Chi tiết đơn hàng</span>
        <span aria-hidden>›</span>
        <span>{order.orderNo}</span>
      </nav>

      <h1 className="order-workspace-page-title">Chi tiết đơn hàng</h1>

      <OrderWorkspaceHeader
        order={order}
        bundle={workspaceData.bundle}
        canEditOrder={canEditOrder}
        canViewFinancials={canViewFinancials}
        busy={busy}
        transitions={transitions}
        correctionTargets={correctionTargets}
        onRequestStatusChange={onRequestStatusChange}
        onOpenCancel={onOpenCancel}
        onOpenCorrection={onOpenCorrection}
      />

      <OrderWorkspaceSummaryCards
        order={order}
        bundle={workspaceData.bundle}
        canViewFinancials={canViewFinancials}
        onNavigateTab={navigateTab}
      />

      <div className="admin-crm-360-tabs order-workspace-tabs" role="tablist">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`admin-crm-360-tab${activeTab === tab.key ? " is-active" : ""}`}
            onClick={() => navigateTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="order-workspace-tab-panel">
        {activeTab === "products" && (
          <div className="order-workspace-products-layout">
            <OrderProductTable
              order={order}
              bundle={workspaceData.bundle}
              itemMaterials={workspaceData.itemMaterials}
              materialRows={workspaceData.materialRows}
              loading={workspaceData.loading}
              canViewProduction={canViewProduction}
              canEditOrder={canEditOrder}
            />
            <OrderProductionSummaryPanel
              orderNo={order.orderNo}
              bundle={workspaceData.bundle}
              materialRows={workspaceData.materialRows}
              canViewProduction={canViewProduction}
              roleCode={roleCode}
            />
          </div>
        )}

        {activeTab === "products" && (
          <OrderItemProductionPanel orderId={orderId} orderStatus={order.status} />
        )}

        {activeTab === "info" && (
          <OrderWorkspaceInfoTab
            order={order}
            canViewFinancials={canViewFinancials}
            canEditOrder={canEditOrder}
            busy={busy}
            productionFields={productionFields}
            productionEmployees={productionEmployees}
            onProductionFieldsChange={onProductionFieldsChange}
            onProductionEmployeesChange={onProductionEmployeesChange}
            onSaveProduction={onSaveProduction}
            onProductionEmployeeCreated={onProductionEmployeeCreated}
          />
        )}

        {activeTab === "delivery" && (
          <OrderWorkspaceDeliveryTab
            orderId={orderId}
            order={order}
            showDeliveryForm={showDeliveryForm}
            canEditOrder={canEditOrder}
            busy={busy}
            deliveryFields={deliveryFields}
            deliveryMethods={deliveryMethods}
            employees={employees}
            carriers={carriers}
            deliveryRefreshKey={deliveryRefreshKey}
            onDeliveryFieldsChange={onDeliveryFieldsChange}
            onCarriersChange={onCarriersChange}
            onSaveDelivery={onSaveDelivery}
            onCarrierCreated={onCarrierCreated}
            onDeliveryRefresh={onDeliveryRefresh}
          />
        )}

        {activeTab === "payment" && canViewFinancials && (
          <OrderWorkspacePaymentTab
            order={order}
            canRecordPayment={canRecordPayment}
            busy={busy}
            onOpenRecordPayment={onOpenRecordPayment}
            onOpenEditPayment={onOpenEditPayment}
            onOpenVoidPayment={onOpenVoidPayment}
          />
        )}

        {activeTab === "activity" && <OrderWorkspaceActivityTab order={order} />}
        {activeTab === "notes" && (
          <OrderWorkspaceNotesTab order={order} canEditOrder={canEditOrder} />
        )}
      </div>

      {activeTab === "products" && (
        <OrderWorkspaceLowerSections
          order={order}
          orderId={orderId}
          productionFileCount={workspaceData.productionFileCount}
          canViewFinancials={canViewFinancials}
          roleCode={roleCode}
          onNavigateTab={navigateTab}
        />
      )}
    </div>
  );
}
