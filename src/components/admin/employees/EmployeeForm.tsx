"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { EmployeeRole } from "@prisma/client";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import { EMPLOYEE_ROLES, EMPLOYEE_ROLE_LABELS } from "@/features/employees/employee-role";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = {
  mode: "create" | "edit";
  employeeId?: string;
};

export default function EmployeeForm({ mode, employeeId }: Props) {
  const router = useRouter();
  const mutate = useAdminMutation();
  const [loading, setLoading] = useState(mode === "edit");
  const [employeeCode, setEmployeeCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<EmployeeRole | "">("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !employeeId) return;
    void fetch(`/api/employees/${employeeId}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          employee?: {
            employeeCode: string;
            fullName: string;
            jobTitle: string | null;
            department: string | null;
            role: EmployeeRole | null;
            phone: string | null;
            email: string | null;
            isActive: boolean;
          };
          message?: string;
        };
        if (!res.ok) throw new Error(data.message ?? "Không tải được nhân viên");
        const emp = data.employee!;
        setEmployeeCode(emp.employeeCode);
        setFullName(emp.fullName);
        setJobTitle(emp.jobTitle ?? "");
        setDepartment(emp.department ?? "");
        setRole(emp.role ?? "");
        setPhone(emp.phone ?? "");
        setEmail(emp.email ?? "");
        setIsActive(emp.isActive);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mode, employeeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      fullName,
      jobTitle: jobTitle || null,
      department: department || null,
      role: role || null,
      phone: phone || null,
      email: email || null,
      isActive,
    };
    const url = mode === "create" ? "/api/employees" : `/api/employees/${employeeId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    await mutate({
      loadingMessage: "Đang lưu…",
      successMessage: "Đã lưu nhân viên.",
      action: async () => {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return parseAdminJsonResponse(res, (data) => data.employee as { id: string });
      },
      onSuccess: (emp) => {
        router.push(mode === "create" ? "/admin/employees" : `/admin/employees/${emp.id}/edit`);
      },
    });
  }

  if (loading) return <AdminLoadingState label="Đang tải nhân viên…" />;

  return (
    <form className="admin-panel" onSubmit={(e) => void handleSubmit(e)}>
      {error && <p className="admin-error">{error}</p>}
      {mode === "edit" && (
        <div className="admin-field">
          <label className="admin-label">Mã nhân viên</label>
          <input className="admin-input" value={employeeCode} readOnly disabled />
        </div>
      )}
      <div className="admin-field">
        <label className="admin-label">Họ tên *</label>
        <input className="admin-input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="admin-field">
        <label className="admin-label">Chức vụ</label>
        <input className="admin-input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      </div>
      <div className="admin-field">
        <label className="admin-label">Vai trò</label>
        <select className="admin-input" value={role} onChange={(e) => setRole(e.target.value as EmployeeRole | "")}>
          <option value="">— Chọn vai trò —</option>
          {EMPLOYEE_ROLES.map((value) => (
            <option key={value} value={value}>{EMPLOYEE_ROLE_LABELS[value]}</option>
          ))}
        </select>
      </div>
      <div className="admin-field">
        <label className="admin-label">Phòng ban</label>
        <input className="admin-input" value={department} onChange={(e) => setDepartment(e.target.value)} />
      </div>
      <div className="admin-field">
        <label className="admin-label">Số điện thoại</label>
        <input className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="admin-field">
        <label className="admin-label">Email</label>
        <input className="admin-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="admin-field">
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Đang hoạt động
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="submit" className="admin-btn admin-btn--primary">
          {mode === "create" ? "Tạo nhân viên" : "Lưu thay đổi"}
        </button>
        <Link href="/admin/employees" className="admin-btn admin-btn--secondary">Quay lại</Link>
      </div>
    </form>
  );
}
