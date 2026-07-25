"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { CustomerStatus } from "@prisma/client";
import {
  CustomerMasterTypeBadge,
  CustomerStatusBadge,
} from "@/components/admin/crm/CustomerBadges";
import { useCustomerTypeOptions } from "@/components/admin/crm/useCustomerTypeOptions";
import { CUSTOMER_STATUS_LABELS } from "@/features/crm/labels";
import { formatCrmDateTime } from "@/features/crm/format";
import { CRM_CUSTOMER_STATUSES, type CrmCustomerRecord } from "@/features/crm/types";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import { useAdminToast } from "@/hooks/useAdminToast";

type LoadState = "loading" | "error" | "empty" | "ready";

type BulkPatchState = {
  status: { enabled: boolean; value: CustomerStatus };
  customerTypeId: { enabled: boolean; value: string };
  province: { enabled: boolean; value: string };
  district: { enabled: boolean; value: string };
  wardNameSnapshot: { enabled: boolean; value: string };
  internalNoteAppend: { enabled: boolean; value: string };
  billingNoteAppend: { enabled: boolean; value: string };
};

type BulkUpdateResult = {
  summary: {
    requested: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  errors: Array<{
    customerId: string;
    customerName: string;
    reason: string;
  }>;
};

const EMPTY_BULK_PATCH: BulkPatchState = {
  status: { enabled: false, value: "ACTIVE" },
  customerTypeId: { enabled: false, value: "" },
  province: { enabled: false, value: "" },
  district: { enabled: false, value: "" },
  wardNameSnapshot: { enabled: false, value: "" },
  internalNoteAppend: { enabled: false, value: "" },
  billingNoteAppend: { enabled: false, value: "" },
};

async function readJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : typeof data?.error?.message === "string"
          ? data.error.message
          : "Yêu cầu không thành công.";
    throw new Error(message);
  }
  return data as T;
}

function bulkFieldEnabled(patch: BulkPatchState) {
  return Object.values(patch).some((field) => field.enabled);
}

export default function CrmCustomersList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();
  const { types: customerTypes } = useCustomerTypeOptions(false);
  const [customers, setCustomers] = useState<CrmCustomerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState(
    searchParams.get("customerTypeId") || "",
  );
  const [unclassifiedFilter, setUnclassifiedFilter] = useState(
    searchParams.get("unclassified") === "1",
  );
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "">(
    (searchParams.get("status") as CustomerStatus) || "",
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [bulkPatch, setBulkPatch] = useState<BulkPatchState>(EMPTY_BULK_PATCH);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkUpdateResult | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (unclassifiedFilter) params.set("unclassified", "1");
      else if (customerTypeFilter) params.set("customerTypeId", customerTypeFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/crm/customers?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message ?? "Không thể tải khách hàng");
        setCustomers([]);
        setLoadState("error");
        return;
      }

      const next = Array.isArray(data.customers) ? data.customers : [];
      setCustomers(next);
      setTotal(data.total ?? next.length);
      setLoadState(next.length === 0 ? "empty" : "ready");
    } catch {
      setErrorMessage("Không thể tải khách hàng");
      setCustomers([]);
      setLoadState("error");
    }
  }, [search, customerTypeFilter, unclassifiedFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleIds = useMemo(() => customers.map((customer) => customer.id), [customers]);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  function openCustomer(id: string) {
    router.push(`/admin/crm/customers/${id}`);
  }

  function toggleCustomer(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }

  function openBulkModal() {
    setBulkPatch(EMPTY_BULK_PATCH);
    setBulkError(null);
    setBulkResult(null);
    setBulkOpen(true);
  }

  function patchField<K extends keyof BulkPatchState>(
    key: K,
    value: Partial<BulkPatchState[K]>,
  ) {
    setBulkPatch((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...value },
    }));
  }

  async function submitBulkUpdate() {
    if (selectedIds.size === 0) {
      setBulkError("Vui lòng chọn ít nhất 1 khách hàng.");
      return;
    }
    if (!bulkFieldEnabled(bulkPatch)) {
      setBulkError("Vui lòng bật ít nhất 1 trường cần cập nhật.");
      return;
    }

    setBulkSaving(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/admin/crm/customers/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerIds: [...selectedIds],
          patch: bulkPatch,
        }),
      });
      const data = await readJsonResponse<BulkUpdateResult>(res);
      setBulkResult(data);
      setBulkOpen(false);
      setConfirmBulkOpen(false);
      setSelectedIds(new Set());
      toast.success("Đã cập nhật hàng loạt khách hàng.");
      await load();
    } catch (err) {
      setConfirmBulkOpen(false);
      const message = err instanceof Error ? err.message : "Không thể cập nhật khách hàng.";
      setBulkError(message);
      toast.error(message);
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>
          Tổng: {total} khách hàng
          {selectedIds.size > 0 ? ` · Đã chọn ${selectedIds.size} khách hàng` : ""}
        </p>
        <div
          className="admin-page-header__actions"
          data-testid="customers-workspace-actions"
          style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
        >
          <Link href="/admin/crm/customer-types" className="admin-btn admin-btn--secondary">
            Loại khách hàng
          </Link>
          {selectedIds.size > 0 ? (
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={openBulkModal}
              data-testid="customers-bulk-action"
            >
              Sửa hàng loạt
            </button>
          ) : null}
          <Link href="/admin/crm/customers/import" className="admin-btn admin-btn--secondary">
            Import Excel
          </Link>
          <Link href="/admin/crm/customers/new" className="admin-btn admin-btn--primary">
            Thêm khách hàng
          </Link>
        </div>
      </div>

      {loadState === "error" && (
        <div className="admin-empty-state admin-empty-state--error">
          <p>{errorMessage}</p>
          <button type="button" className="admin-btn" onClick={() => void load()}>
            Thử lại
          </button>
        </div>
      )}

      {loadState === "loading" && (
        <TableLoading
          title="Đang tải danh sách khách hàng..."
          description="Hệ thống đang tải dữ liệu khách hàng theo bộ lọc hiện tại."
          tone="admin"
        />
      )}

      {loadState !== "loading" && loadState !== "error" && (
        <form
          className="admin-crm-filters"
          data-testid="customers-workspace-filters"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <input
            type="search"
            placeholder="Tìm tên, mã, SĐT, email, MST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input admin-data-toolbar__search"
          />
          <select
            value={unclassifiedFilter ? "__unclassified__" : customerTypeFilter}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "__unclassified__") {
                setUnclassifiedFilter(true);
                setCustomerTypeFilter("");
              } else {
                setUnclassifiedFilter(false);
                setCustomerTypeFilter(value);
              }
            }}
            className="admin-input"
          >
            <option value="">Tất cả loại khách hàng</option>
            <option value="__unclassified__">Chưa phân loại</option>
            {customerTypes
              .filter((type) => type.isActive)
              .map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | "")}
            className="admin-input"
          >
            <option value="">Tất cả trạng thái</option>
            {CRM_CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CUSTOMER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button type="submit" className="admin-btn">
            Lọc
          </button>
        </form>
      )}

      {bulkResult && (
        <div className="admin-section-card" style={{ padding: 16 }}>
          <div className="admin-section-card__header">
            <div>
              <h2>Kết quả sửa hàng loạt</h2>
              <p className="admin-section-card__description">
                Đã cập nhật: {bulkResult.summary.updated} · Bỏ qua: {bulkResult.summary.skipped} · Lỗi:{" "}
                {bulkResult.summary.errors}
              </p>
            </div>
          </div>
          {bulkResult.errors.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResult.errors.map((error) => (
                    <tr key={`${error.customerId}-${error.reason}`}>
                      <td>{error.customerName || error.customerId}</td>
                      <td>{error.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {loadState === "empty" && (
        <div className="admin-empty-state">
          <p>Chưa có khách hàng nào</p>
          <Link href="/admin/crm/customers/new" className="admin-btn admin-btn--primary">
            Thêm khách hàng
          </Link>
        </div>
      )}

      {loadState === "ready" && (
        <div className="admin-table-wrap admin-table-wrap--crm">
          <table className="admin-table admin-table--crm">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả khách hàng đang hiển thị"
                    checked={allVisibleSelected}
                    onChange={(event) => toggleVisible(event.target.checked)}
                  />
                </th>
                <th>Mã KH</th>
                <th>Tên khách hàng</th>
                <th>SĐT</th>
                <th>Email</th>
                <th>Tỉnh/TP</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="admin-crm-row"
                  onClick={() => openCustomer(customer.id)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openCustomer(customer.id);
                    }
                  }}
                >
                  <td onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${customer.name}`}
                      checked={selectedIds.has(customer.id)}
                      onChange={(event) => toggleCustomer(customer.id, event.target.checked)}
                    />
                  </td>
                  <td>{customer.code}</td>
                  <td>
                    <div>{customer.name}</div>
                    <CustomerMasterTypeBadge label={customer.customerType?.name} />
                  </td>
                  <td>{customer.phone || "—"}</td>
                  <td>{customer.email || "—"}</td>
                  <td>{customer.province || customer.provinceNameSnapshot || "—"}</td>
                  <td>
                    <CustomerStatusBadge status={customer.status} />
                  </td>
                  <td>{formatCrmDateTime(customer.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bulkOpen && (
        <div className="admin-modal-overlay" role="presentation" onClick={() => setBulkOpen(false)}>
          <div className="admin-modal admin-modal--wide" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Sửa hàng loạt khách hàng</h2>
                <p className="admin-field-hint">
                  Chỉ các trường được bật sẽ được cập nhật. Các trường không bật sẽ giữ nguyên.
                </p>
              </div>
            </div>

            <div className="admin-form admin-form--compact" style={{ display: "grid", gap: 12 }}>
              <label className="admin-checkbox-row">
                <input
                  type="checkbox"
                  checked={bulkPatch.status.enabled}
                  onChange={(event) => patchField("status", { enabled: event.target.checked })}
                />
                Cập nhật Customer Status
              </label>
              <select
                className="admin-input"
                value={bulkPatch.status.value}
                disabled={!bulkPatch.status.enabled}
                onChange={(event) => patchField("status", { value: event.target.value as CustomerStatus })}
              >
                {CRM_CUSTOMER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {CUSTOMER_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>

              <label className="admin-checkbox-row">
                <input
                  type="checkbox"
                  checked={bulkPatch.customerTypeId.enabled}
                  onChange={(event) => patchField("customerTypeId", { enabled: event.target.checked })}
                />
                Cập nhật Customer Type
              </label>
              <select
                className="admin-input"
                value={bulkPatch.customerTypeId.value}
                disabled={!bulkPatch.customerTypeId.enabled}
                onChange={(event) => patchField("customerTypeId", { value: event.target.value })}
              >
                <option value="">— Chưa phân loại —</option>
                {customerTypes
                  .filter((type) => type.isActive)
                  .map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
              </select>

              {(["province", "district", "wardNameSnapshot"] as const).map((key) => (
                <div key={key} style={{ display: "grid", gap: 8 }}>
                  <label className="admin-checkbox-row">
                    <input
                      type="checkbox"
                      checked={bulkPatch[key].enabled}
                      onChange={(event) => patchField(key, { enabled: event.target.checked })}
                    />
                    Cập nhật {key === "wardNameSnapshot" ? "Ward" : key[0].toUpperCase() + key.slice(1)}
                  </label>
                  <input
                    className="admin-input"
                    value={bulkPatch[key].value}
                    disabled={!bulkPatch[key].enabled}
                    onChange={(event) => patchField(key, { value: event.target.value })}
                  />
                </div>
              ))}

              <label className="admin-checkbox-row">
                <input
                  type="checkbox"
                  checked={bulkPatch.internalNoteAppend.enabled}
                  onChange={(event) => patchField("internalNoteAppend", { enabled: event.target.checked })}
                />
                Internal Notes append
              </label>
              <textarea
                className="admin-input"
                rows={3}
                value={bulkPatch.internalNoteAppend.value}
                disabled={!bulkPatch.internalNoteAppend.enabled}
                onChange={(event) => patchField("internalNoteAppend", { value: event.target.value })}
              />

              <label className="admin-checkbox-row">
                <input
                  type="checkbox"
                  checked={bulkPatch.billingNoteAppend.enabled}
                  onChange={(event) => patchField("billingNoteAppend", { enabled: event.target.checked })}
                />
                Billing Notes append
              </label>
              <textarea
                className="admin-input"
                rows={3}
                value={bulkPatch.billingNoteAppend.value}
                disabled={!bulkPatch.billingNoteAppend.enabled}
                onChange={(event) => patchField("billingNoteAppend", { value: event.target.value })}
              />
            </div>

            {bulkError && <p className="admin-message admin-message--error">{bulkError}</p>}

            <div className="admin-modal__actions">
              <button type="button" className="admin-btn" onClick={() => setBulkOpen(false)} disabled={bulkSaving}>
                Hủy
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={bulkSaving || selectedIds.size === 0 || !bulkFieldEnabled(bulkPatch)}
                onClick={() => setConfirmBulkOpen(true)}
              >
                {bulkSaving ? "Đang cập nhật khách hàng..." : "Cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBulkOpen && (
        <div className="admin-modal-overlay" role="presentation" onClick={() => setConfirmBulkOpen(false)}>
          <div className="admin-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2>Xác nhận sửa hàng loạt</h2>
            <p>
              Bạn sắp cập nhật {selectedIds.size} khách hàng. Chỉ các trường đã bật sẽ được thay đổi.
            </p>
            <div className="admin-modal__actions">
              <button type="button" className="admin-btn" onClick={() => setConfirmBulkOpen(false)} disabled={bulkSaving}>
                Hủy
              </button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => void submitBulkUpdate()} disabled={bulkSaving}>
                {bulkSaving ? "Đang cập nhật khách hàng..." : "Cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
