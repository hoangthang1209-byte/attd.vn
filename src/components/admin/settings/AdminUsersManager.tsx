"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminUserListRecord } from "@/features/admin-users/admin-user.service";
import type { AdminRoleRecord } from "@/features/admin-roles/admin-role.service";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import {
  AdminLoadingState,
  AdminPageShell,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/admin/AdminUi";
import { formatCrmDateTime } from "@/features/crm/format";

export default function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUserListRecord[]>([]);
  const [roles, setRoles] = useState<AdminRoleRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes, employeesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/roles"),
        fetch("/api/employees?active=1&limit=200"),
      ]);
      const usersData = await usersRes.json() as { users?: AdminUserListRecord[]; message?: string };
      const rolesData = await rolesRes.json() as { roles?: AdminRoleRecord[] };
      const employeesData = await employeesRes.json() as { employees?: EmployeeRecord[] };
      if (!usersRes.ok) throw new Error(usersData.message ?? "Không thể tải tài khoản");
      setUsers(usersData.users ?? []);
      setRoles(rolesData.roles ?? []);
      setEmployees(employeesData.employees ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        employeeId: employeeId || null,
        roleId,
      }),
    });
    const data = await res.json() as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể tạo tài khoản");
      return;
    }
    setFormOpen(false);
    setUsername("");
    setPassword("");
    setPasswordConfirm("");
    setEmployeeId("");
    setRoleId("");
    void load();
  }

  async function toggleActive(user: AdminUserListRecord) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) void load();
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUserId) return;
    if (resetPassword !== resetPasswordConfirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    const res = await fetch(`/api/admin/users/${resetUserId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    const data = await res.json() as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể đặt lại mật khẩu");
      return;
    }
    setResetUserId(null);
    setResetPassword("");
    setResetPasswordConfirm("");
  }

  return (
    <AdminPageShell>
      <PageHeader
        description="Tạo và quản lý tài khoản đăng nhập nội bộ cho nhân viên."
        meta={<span>Tổng: {users.length} tài khoản</span>}
        actions={
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setFormOpen(true)}>
            Tạo tài khoản
          </button>
        }
      />

      {error && <p className="admin-error">{error}</p>}
      {loading ? <AdminLoadingState label="Đang tải tài khoản…" /> : users.length === 0 ? (
        <EmptyState title="Chưa có tài khoản" description="Tạo tài khoản để nhân viên đăng nhập bằng tên riêng." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên đăng nhập</th>
                <th>Nhân viên</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Lần đăng nhập</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><code>{user.username}</code></td>
                  <td>{user.employeeName ?? "—"}</td>
                  <td>{user.roleName ?? user.roleCode ?? "—"}</td>
                  <td>
                    <StatusBadge tone={user.isActive ? "success" : "neutral"}>
                      {user.isActive ? "Hoạt động" : "Đã khóa"}
                    </StatusBadge>
                  </td>
                  <td>{user.lastLoginAt ? formatCrmDateTime(user.lastLoginAt) : "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => setResetUserId(user.id)}>
                        Đặt lại MK
                      </button>
                      {user.roleCode !== "OWNER" && (
                        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void toggleActive(user)}>
                          {user.isActive ? "Khóa" : "Mở khóa"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setFormOpen(false)} aria-hidden="true" />
          <form className="quote-quick-contact-modal__panel" onSubmit={(e) => void handleCreate(e)}>
            <h3 className="quote-quick-contact-modal__title">Tạo tài khoản</h3>
            <div className="admin-field">
              <label className="admin-label">Tên đăng nhập</label>
              <input className="admin-input" required value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Mật khẩu</label>
              <input className="admin-input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Xác nhận mật khẩu</label>
              <input className="admin-input" type="password" required minLength={8} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Nhân viên liên kết</label>
              <select className="admin-input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">— Không liên kết —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Vai trò</label>
              <select className="admin-input" required value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">Chọn vai trò</option>
                {roles.filter((r) => r.isActive).map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setFormOpen(false)}>Hủy</button>
              <button type="submit" className="admin-btn admin-btn--primary">Tạo</button>
            </div>
          </form>
        </div>
      )}

      {resetUserId && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setResetUserId(null)} aria-hidden="true" />
          <form className="quote-quick-contact-modal__panel" onSubmit={(e) => void handleResetPassword(e)}>
            <h3 className="quote-quick-contact-modal__title">Đặt lại mật khẩu</h3>
            <div className="admin-field">
              <label className="admin-label">Mật khẩu mới</label>
              <input className="admin-input" type="password" required minLength={8} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Xác nhận mật khẩu mới</label>
              <input className="admin-input" type="password" required minLength={8} value={resetPasswordConfirm} onChange={(e) => setResetPasswordConfirm(e.target.value)} />
            </div>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setResetUserId(null)}>Hủy</button>
              <button type="submit" className="admin-btn admin-btn--primary">Lưu</button>
            </div>
          </form>
        </div>
      )}
    </AdminPageShell>
  );
}
