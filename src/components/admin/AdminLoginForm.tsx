"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import { employeeRoleLabel } from "@/features/employees/employee-role";

type AdminLoginFormProps = {
  configWarning?: string | null;
  employees: EmployeeRecord[];
};

function AdminLoginFormInner({ configWarning, employees }: AdminLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin/dashboard";
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          employeeId: employeeId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Đăng nhập thất bại.");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <h1 className="admin-login-title">ATTD CMS</h1>
        <p className="admin-field-hint">Đăng nhập quản trị</p>

        {configWarning && <p className="admin-kb-warning">{configWarning}</p>}

        <form className="admin-login-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-employee">
              Nhân viên (tuỳ chọn)
            </label>
            <select
              id="admin-employee"
              className="admin-input"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">Quản trị / toàn quyền</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                  {employee.role ? ` · ${employeeRoleLabel(employee.role)}` : ""}
                </option>
              ))}
            </select>
            <p className="admin-field-hint">
              Chọn nhân viên sản xuất để ẩn thông tin tài chính. Bỏ trống nếu đăng nhập quản trị.
            </p>
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-password">
              Mật khẩu admin
            </label>
            <input
              id="admin-password"
              type="password"
              className="admin-input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="admin-error">{error}</p>}
          <button
            type="submit"
            className="admin-btn admin-btn--primary admin-login-submit"
            disabled={loading}
          >
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginForm(props: AdminLoginFormProps) {
  return (
    <Suspense fallback={<p className="admin-loading">Đang tải…</p>}>
      <AdminLoginFormInner {...props} />
    </Suspense>
  );
}
