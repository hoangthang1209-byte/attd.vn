"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DealerCompanyStatus, DealerCompanyType, DealerLevel } from "@prisma/client";
import {
  DealerCompanyStatusBadge,
  DealerCompanyTypeBadge,
  DealerLevelBadge,
} from "@/components/admin/dealer/DealerBadges";
import {
  DEALER_COMPANY_STATUS_LABELS,
  DEALER_COMPANY_TYPE_LABELS,
  DEALER_LEVEL_LABELS,
} from "@/features/dealer/labels";
import {
  DEALER_COMPANY_STATUSES,
  DEALER_COMPANY_TYPES,
  DEALER_LEVELS,
  type DealerCompanyRecord,
} from "@/features/dealer/types";
import { formatCrmDateTime } from "@/features/crm/format";

type LoadState = "loading" | "error" | "empty" | "ready";

export default function DealerCompaniesList() {
  const router = useRouter();
  const [companies, setCompanies] = useState<DealerCompanyRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DealerCompanyStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<DealerCompanyType | "">("");
  const [levelFilter, setLevelFilter] = useState<DealerLevel | "">("");

  const load = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (levelFilter) params.set("level", levelFilter);

      const res = await fetch(`/api/dealer/companies?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message ?? "Không thể tải danh sách đại lý");
        setCompanies([]);
        setLoadState("error");
        return;
      }

      const next = Array.isArray(data.companies) ? data.companies : [];
      setCompanies(next);
      setTotal(data.total ?? next.length);
      setLoadState(next.length === 0 ? "empty" : "ready");
    } catch {
      setErrorMessage("Không thể tải danh sách đại lý");
      setCompanies([]);
      setLoadState("error");
    }
  }, [search, statusFilter, typeFilter, levelFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCompany(id: string) {
    router.push(`/admin/dealer/${id}`);
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>Tổng: {total} đại lý</p>
        <Link href="/admin/dealer/new" className="admin-btn admin-btn--primary">
          Thêm đại lý
        </Link>
      </div>

      {loadState === "error" && (
        <div className="admin-empty-state admin-empty-state--error">
          <p>{errorMessage}</p>
          <button type="button" className="admin-btn" onClick={() => void load()}>
            Thử lại
          </button>
        </div>
      )}

      {loadState === "loading" && <p className="admin-loading">Đang tải...</p>}

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
            placeholder="Tìm mã, tên công ty, email, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DealerCompanyStatus | "")}
            className="admin-input"
          >
            <option value="">Tất cả trạng thái</option>
            {DEALER_COMPANY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DEALER_COMPANY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DealerCompanyType | "")}
            className="admin-input"
          >
            <option value="">Tất cả loại</option>
            {DEALER_COMPANY_TYPES.map((t) => (
              <option key={t} value={t}>
                {DEALER_COMPANY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as DealerLevel | "")}
            className="admin-input"
          >
            <option value="">Tất cả cấp</option>
            {DEALER_LEVELS.map((l) => (
              <option key={l} value={l}>
                {DEALER_LEVEL_LABELS[l]}
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
          <p>Chưa có đại lý nào</p>
          <Link href="/admin/dealer/new" className="admin-btn admin-btn--primary">
            Thêm đại lý
          </Link>
        </div>
      )}

      {loadState === "ready" && (
        <div className="admin-table-wrap admin-table-wrap--crm">
          <table className="admin-table admin-table--crm">
            <thead>
              <tr>
                <th>Mã đại lý</th>
                <th>Tên công ty</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Cấp đại lý</th>
                <th>Nhóm giá</th>
                <th>Khách hàng CRM</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr
                  key={company.id}
                  className="admin-crm-row"
                  onClick={() => openCompany(company.id)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openCompany(company.id);
                    }
                  }}
                >
                  <td>{company.code}</td>
                  <td>{company.name}</td>
                  <td>
                    <DealerCompanyTypeBadge type={company.type} />
                  </td>
                  <td>
                    <DealerCompanyStatusBadge status={company.status} />
                  </td>
                  <td>
                    <DealerLevelBadge level={company.level} />
                  </td>
                  <td>{company.priceGroup?.name ?? "—"}</td>
                  <td>{company.customer?.name ?? "—"}</td>
                  <td>{formatCrmDateTime(company.createdAt)}</td>
                  <td>
                    <Link
                      href={`/admin/dealer/${company.id}`}
                      className="admin-btn admin-btn--sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
