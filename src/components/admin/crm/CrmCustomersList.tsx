"use client";

import { useCallback, useEffect, useState } from "react";
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

type LoadState = "loading" | "error" | "empty" | "ready";

export default function CrmCustomersList() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  function openCustomer(id: string) {
    router.push(`/admin/crm/customers/${id}`);
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>Tổng: {total} khách hàng</p>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/crm/customer-types" className="admin-btn admin-btn--secondary">
            Loại khách hàng
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
            className="admin-input"
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
    </div>
  );
}
