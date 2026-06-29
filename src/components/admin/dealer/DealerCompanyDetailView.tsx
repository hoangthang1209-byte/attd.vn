"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DealerCompanyStatusBadge,
  DealerCompanyTypeBadge,
  DealerLevelBadge,
  DealerUserRoleBadge,
  DealerUserStatusBadge,
} from "@/components/admin/dealer/DealerBadges";
import {
  DEALER_ACTIVITY_TYPE_LABELS,
  DEALER_USER_ROLE_LABELS,
} from "@/features/dealer/labels";
import type {
  DealerActivityRecord,
  DealerCompanyRecord,
  DealerUserRecord,
} from "@/features/dealer/types";
import { DEALER_USER_ROLES } from "@/features/dealer/types";
import { formatCrmDateTime } from "@/features/crm/format";
import type { CrmCustomerRecord } from "@/features/crm/types";
import type { PriceGroupRecord } from "@/features/pricing/types";

type TabId = "overview" | "users" | "crm" | "pricing" | "activity";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "users", label: "Người dùng" },
  { id: "crm", label: "CRM" },
  { id: "pricing", label: "Nhóm giá" },
  { id: "activity", label: "Hoạt động" },
];

type DealerCompanyDetailViewProps = {
  companyId: string;
};

export default function DealerCompanyDetailView({ companyId }: DealerCompanyDetailViewProps) {
  const [tab, setTab] = useState<TabId>("overview");
  const [company, setCompany] = useState<DealerCompanyRecord | null>(null);
  const [users, setUsers] = useState<DealerUserRecord[]>([]);
  const [activities, setActivities] = useState<DealerActivityRecord[]>([]);
  const [priceGroups, setPriceGroups] = useState<PriceGroupRecord[]>([]);
  const [crmSearch, setCrmSearch] = useState("");
  const [crmResults, setCrmResults] = useState<CrmCustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedPriceGroupId, setSelectedPriceGroupId] = useState("");
  const [userForm, setUserForm] = useState({ name: "", email: "", phone: "", role: "VIEWER" });

  const loadCompany = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dealer/companies/${companyId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể tải đại lý");
        setCompany(null);
        return;
      }
      setCompany(data.company);
      setSelectedPriceGroupId(data.company?.priceGroupId ?? "");
    } catch {
      setError("Không thể tải đại lý");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const loadUsers = useCallback(async () => {
    const res = await fetch(`/api/dealer/companies/${companyId}/users`);
    const data = await res.json();
    if (res.ok) setUsers(Array.isArray(data.users) ? data.users : []);
  }, [companyId]);

  const loadActivities = useCallback(async () => {
    const res = await fetch(`/api/dealer/companies/${companyId}/activities`);
    const data = await res.json();
    if (res.ok) setActivities(Array.isArray(data.activities) ? data.activities : []);
  }, [companyId]);

  const loadPriceGroups = useCallback(async () => {
    const res = await fetch("/api/pricing/price-groups?activeOnly=1");
    const data = await res.json();
    if (res.ok) setPriceGroups(Array.isArray(data.priceGroups) ? data.priceGroups : []);
  }, []);

  useEffect(() => {
    void loadCompany();
    void loadUsers();
    void loadActivities();
    void loadPriceGroups();
  }, [loadCompany, loadUsers, loadActivities, loadPriceGroups]);

  async function runAction(
    url: string,
    method: string,
    body?: Record<string, unknown>,
    successMessage?: string,
  ) {
    setActionMessage(null);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      setActionMessage(data.message ?? "Thao tác thất bại");
      return;
    }
    setActionMessage(successMessage ?? data.message ?? "Đã cập nhật");
    if (data.company) setCompany(data.company);
    await loadCompany();
    await loadActivities();
  }

  async function searchCrmCustomers() {
    const params = new URLSearchParams();
    if (crmSearch.trim()) params.set("search", crmSearch.trim());
    const res = await fetch(`/api/crm/customers?${params.toString()}`);
    const data = await res.json();
    if (res.ok) setCrmResults(Array.isArray(data.customers) ? data.customers : []);
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/dealer/companies/${companyId}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionMessage(data.message ?? "Không thể thêm người dùng");
      return;
    }
    setActionMessage("Đã thêm người dùng đại lý");
    setUserForm({ name: "", email: "", phone: "", role: "VIEWER" });
    await loadUsers();
    await loadActivities();
  }

  if (loading) return <p className="admin-loading">Đang tải...</p>;
  if (error || !company) {
    return (
      <div className="admin-empty-state admin-empty-state--error">
        <p>{error ?? "Không tìm thấy đại lý"}</p>
        <Link href="/admin/dealer" className="admin-btn">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <div>
          <p className="admin-meta">{company.code}</p>
          <h2 className="admin-subtitle">{company.name}</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <DealerCompanyStatusBadge status={company.status} />
            <DealerCompanyTypeBadge type={company.type} />
            <DealerLevelBadge level={company.level} />
          </div>
        </div>
        <Link href="/admin/dealer" className="admin-btn">
          Quay lại
        </Link>
      </div>

      {actionMessage && <p className="admin-form-note">{actionMessage}</p>}

      <div className="admin-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`admin-tab${tab === item.id ? " admin-tab--active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="admin-detail-grid">
          <section className="admin-card">
            <h3>Thông tin công ty</h3>
            <dl className="admin-dl">
              <div><dt>Tên pháp lý</dt><dd>{company.legalName ?? "—"}</dd></div>
              <div><dt>MST</dt><dd>{company.taxCode ?? "—"}</dd></div>
              <div><dt>Email</dt><dd>{company.email ?? "—"}</dd></div>
              <div><dt>SĐT</dt><dd>{company.phone ?? "—"}</dd></div>
              <div><dt>Website</dt><dd>{company.website ?? "—"}</dd></div>
              <div><dt>Địa chỉ</dt><dd>{company.address ?? "—"}</dd></div>
              <div><dt>Thành phố</dt><dd>{company.city ?? "—"}</dd></div>
              <div><dt>Quốc gia</dt><dd>{company.country}</dd></div>
              <div><dt>Ngày tạo</dt><dd>{formatCrmDateTime(company.createdAt)}</dd></div>
              {company.notes && <div><dt>Ghi chú</dt><dd>{company.notes}</dd></div>}
            </dl>
          </section>

          <section className="admin-card">
            <h3>Thao tác nhanh</h3>
            <div className="admin-form-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
              {company.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    onClick={() => void runAction(`/api/dealer/companies/${companyId}/approve`, "POST", {}, "Đã duyệt đại lý")}
                  >
                    Duyệt đại lý
                  </button>
                  <label className="admin-field">
                    <span>Lý do từ chối</span>
                    <textarea
                      className="admin-input"
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() =>
                      void runAction(
                        `/api/dealer/companies/${companyId}/reject`,
                        "POST",
                        { reason: rejectReason },
                        "Đã từ chối đại lý",
                      )
                    }
                  >
                    Từ chối
                  </button>
                </>
              )}
              {company.status === "APPROVED" && (
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() =>
                    void runAction(
                      `/api/dealer/companies/${companyId}`,
                      "PATCH",
                      { status: "SUSPENDED" },
                      "Đã tạm ngưng đại lý",
                    )
                  }
                >
                  Tạm ngưng
                </button>
              )}
              {company.status === "SUSPENDED" && (
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() =>
                    void runAction(
                      `/api/dealer/companies/${companyId}/approve`,
                      "POST",
                      {},
                      "Đã kích hoạt lại đại lý",
                    )
                  }
                >
                  Kích hoạt lại
                </button>
              )}
              <button type="button" className="admin-btn" onClick={() => setTab("pricing")}>
                Gán nhóm giá
              </button>
              <button type="button" className="admin-btn" onClick={() => setTab("crm")}>
                Liên kết khách hàng CRM
              </button>
            </div>
          </section>
        </div>
      )}

      {tab === "users" && (
        <div>
          <form className="admin-form admin-card" onSubmit={(e) => void addUser(e)}>
            <h3>Thêm người dùng</h3>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>Họ tên *</span>
                <input className="admin-input" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
              </label>
              <label className="admin-field">
                <span>Email *</span>
                <input type="email" className="admin-input" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
              </label>
              <label className="admin-field">
                <span>SĐT</span>
                <input className="admin-input" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
              </label>
              <label className="admin-field">
                <span>Vai trò</span>
                <select className="admin-input" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                  {DEALER_USER_ROLES.map((r) => (
                    <option key={r} value={r}>{DEALER_USER_ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit" className="admin-btn admin-btn--primary">Thêm người dùng</button>
          </form>

          <div className="admin-table-wrap" style={{ marginTop: 16 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={5}>Chưa có người dùng</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td><DealerUserRoleBadge role={user.role} /></td>
                      <td><DealerUserStatusBadge status={user.status} /></td>
                      <td>
                        {user.status !== "DISABLED" && (
                          <button
                            type="button"
                            className="admin-btn admin-btn--sm"
                            onClick={() =>
                              void fetch(`/api/dealer/users/${user.id}/disable`, { method: "POST" }).then(() => {
                                void loadUsers();
                                void loadActivities();
                              })
                            }
                          >
                            Vô hiệu
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "crm" && (
        <section className="admin-card">
          <h3>Liên kết CRM</h3>
          {company.customer ? (
            <p>
              Đã liên kết: <Link href={`/admin/crm/customers/${company.customer.id}`}>{company.customer.code} — {company.customer.name}</Link>
            </p>
          ) : (
            <p>Chưa liên kết khách hàng CRM. Bạn có thể liên kết sau khi tạo hồ sơ khách hàng trong CRM.</p>
          )}
          <div className="admin-crm-filters" style={{ marginTop: 12 }}>
            <input
              className="admin-input"
              placeholder="Tìm khách hàng CRM..."
              value={crmSearch}
              onChange={(e) => setCrmSearch(e.target.value)}
            />
            <button type="button" className="admin-btn" onClick={() => void searchCrmCustomers()}>
              Tìm
            </button>
          </div>
          {crmResults.length > 0 && (
            <ul className="admin-list" style={{ marginTop: 12 }}>
              {crmResults.map((customer) => (
                <li key={customer.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0" }}>
                  <span>{customer.code} — {customer.name}</span>
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm"
                    onClick={() =>
                      void runAction(
                        `/api/dealer/companies/${companyId}/link-customer`,
                        "POST",
                        { customerId: customer.id },
                        "Đã liên kết khách hàng CRM",
                      )
                    }
                  >
                    Liên kết
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "pricing" && (
        <section className="admin-card">
          <h3>Nhóm giá đại lý</h3>
          <p>Hiện tại: {company.priceGroup ? `${company.priceGroup.code} — ${company.priceGroup.name}` : "Chưa gán"}</p>
          <div className="admin-crm-filters" style={{ marginTop: 12 }}>
            <select
              className="admin-input"
              value={selectedPriceGroupId}
              onChange={(e) => setSelectedPriceGroupId(e.target.value)}
            >
              <option value="">Chọn nhóm giá</option>
              {priceGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={!selectedPriceGroupId}
              onClick={() =>
                void runAction(
                  `/api/dealer/companies/${companyId}/assign-price-group`,
                  "POST",
                  { priceGroupId: selectedPriceGroupId },
                  "Đã gán nhóm giá",
                )
              }
            >
              Gán nhóm giá
            </button>
          </div>
          <p className="admin-form-note" style={{ marginTop: 12 }}>
            Mặc định khi duyệt: DEALER_PRICE (Giá đại lý) nếu chưa gán nhóm giá.
          </p>
        </section>
      )}

      {tab === "activity" && (
        <section className="admin-card">
          <h3>Lịch sử hoạt động</h3>
          {activities.length === 0 ? (
            <p>Chưa có hoạt động</p>
          ) : (
            <ul className="admin-timeline">
              {activities.map((item) => (
                <li key={item.id} className="admin-timeline-item">
                  <div className="admin-timeline-meta">{formatCrmDateTime(item.createdAt)}</div>
                  <strong>{item.title}</strong>
                  <span className="admin-meta"> — {DEALER_ACTIVITY_TYPE_LABELS[item.type]}</span>
                  {item.description && <p>{item.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
