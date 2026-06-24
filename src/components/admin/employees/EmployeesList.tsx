"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmployeeRole } from "@prisma/client";
import { formatCrmDateTime } from "@/features/crm/format";
import {
  AdminLoadingState,
  AdminPageShell,
  DataToolbar,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/admin/AdminUi";
import { EMPLOYEE_ROLES, EMPLOYEE_ROLE_LABELS, employeeRoleLabel } from "@/features/employees/employee-role";
import type { EmployeeRecord } from "@/features/employees/employee.service";

export default function EmployeesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | "">(
    (searchParams.get("role") as EmployeeRole | null) ?? "",
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (activeOnly) params.set("active", "1");
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`/api/employees?${params}`);
      const data = (await res.json()) as {
        employees?: EmployeeRecord[];
        total?: number;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải danh sách");
      setEmployees(data.employees ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [search, activeOnly, roleFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggleActive(id: string, isActive: boolean) {
    const res = await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) void load();
  }

  return (
    <AdminPageShell>
      <PageHeader
        description="Quản lý nhân sự được sử dụng trong báo giá, đơn hàng, sản xuất và giao hàng."
        meta={<span>Tổng: {total} nhân viên</span>}
        actions={
          <Link href="/admin/employees/new" className="admin-btn admin-btn--primary">
            Thêm nhân viên
          </Link>
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <DataToolbar>
          <input
            className="admin-input admin-data-toolbar__search"
            placeholder="Tìm mã, tên, SĐT, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="admin-input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as EmployeeRole | "")}
          >
            <option value="">Tất cả vai trò</option>
            {EMPLOYEE_ROLES.map((role) => (
              <option key={role} value={role}>{EMPLOYEE_ROLE_LABELS[role]}</option>
            ))}
          </select>
          <label className="admin-checkbox-label admin-data-toolbar__checkbox">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
            Chỉ đang hoạt động
          </label>
          <button type="submit" className="admin-btn admin-btn--secondary">Tìm kiếm</button>
        </DataToolbar>
      </form>

      {error && <p className="admin-error">{error}</p>}
      {loading && <AdminLoadingState label="Đang tải danh sách nhân viên…" />}

      {!loading && employees.length === 0 && (
        <EmptyState
          title="Chưa có nhân viên phù hợp"
          description="Thêm nhân viên mới hoặc thay đổi bộ lọc để xem thêm kết quả."
          action={<Link href="/admin/employees/new" className="admin-btn admin-btn--primary">Thêm nhân viên</Link>}
        />
      )}

      {!loading && employees.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ tên</th>
                <th>Vai trò</th>
                <th>Chức vụ</th>
                <th>Phòng ban</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.employeeCode}</td>
                  <td>{emp.fullName}</td>
                  <td>{employeeRoleLabel(emp.role)}</td>
                  <td>{emp.jobTitle ?? "—"}</td>
                  <td>{emp.department ?? "—"}</td>
                  <td>{emp.phone ?? "—"}</td>
                  <td>{emp.email ?? "—"}</td>
                  <td>
                    <StatusBadge tone={emp.isActive ? "success" : "neutral"}>
                      {emp.isActive ? "Đang hoạt động" : "Ngưng sử dụng"}
                    </StatusBadge>
                  </td>
                  <td>{formatCrmDateTime(emp.createdAt)}</td>
                  <td className="admin-table-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--small"
                      onClick={() => router.push(`/admin/employees/${emp.id}/edit`)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--small"
                      onClick={() => void handleToggleActive(emp.id, emp.isActive)}
                    >
                      {emp.isActive ? "Ngưng" : "Kích hoạt"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  );
}
