"use client";

import { useRef, useState } from "react";
import AdminQuickCreateShell from "@/components/admin/AdminQuickCreateShell";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (employee: EmployeeRecord) => void;
};

const FORM_ID = "quick-add-production-employee-form";

export default function QuickAddProductionEmployeeModal({ open, onClose, onCreated }: Props) {
  const mutate = useAdminMutation();
  const submitLock = useRef(false);
  const [pending, setPending] = useState(false);
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setFullName("");
    setJobTitle("");
    setPhone("");
    setEmail("");
    setDepartment("");
    setFormError(null);
    setFieldErrors({});
    setPending(false);
    submitLock.current = false;
  }

  function handleClose() {
    if (pending) return;
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || submitLock.current) return;

    setFormError(null);
    setFieldErrors({});
    if (!fullName.trim()) {
      setFieldErrors({ fullName: "Vui lòng nhập họ tên." });
      return;
    }

    submitLock.current = true;
    setPending(true);

    await mutate({
      loadingMessage: "Đang tạo nhân viên…",
      successMessage: "Đã thêm nhân viên sản xuất.",
      errorFallback: "Không thể tạo nhân viên. Vui lòng kiểm tra lại thông tin.",
      onError: (message) => setFormError(message),
      action: async () => {
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName.trim(),
            jobTitle: jobTitle.trim() || null,
            department: department.trim() || null,
            role: "PRODUCTION",
            phone: phone.trim() || null,
            email: email.trim() || null,
            isActive: true,
          }),
        });
        return parseAdminJsonResponse(res, (data) => data.employee as EmployeeRecord);
      },
      onSuccess: (employee) => {
        onCreated(employee);
        resetForm();
        onClose();
      },
    });

    setPending(false);
    submitLock.current = false;
  }

  return (
    <AdminQuickCreateShell
      open={open}
      title="Thêm nhân viên sản xuất"
      subtitle="Vai trò: Sản xuất"
      size="compact"
      onClose={handleClose}
      pending={pending}
      footer={
        <>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={handleClose} disabled={pending}>
            Hủy
          </button>
          <button type="submit" form={FORM_ID} className="admin-btn admin-btn--primary" disabled={pending}>
            Tạo nhân viên
          </button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={(e) => void handleSubmit(e)}>
        {formError && <p className="admin-error">{formError}</p>}
        <div className="admin-field">
          <label className="admin-label" htmlFor="qa-prod-fullName">Họ tên *</label>
          <input
            id="qa-prod-fullName"
            className="admin-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={pending}
          />
          {fieldErrors.fullName && <p className="admin-field-error">{fieldErrors.fullName}</p>}
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="qa-prod-jobTitle">Chức vụ</label>
          <input
            id="qa-prod-jobTitle"
            className="admin-input"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="qa-prod-phone">Số điện thoại</label>
          <input
            id="qa-prod-phone"
            className="admin-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="qa-prod-email">Email</label>
          <input
            id="qa-prod-email"
            className="admin-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="qa-prod-department">Phòng ban</label>
          <input
            id="qa-prod-department"
            className="admin-input"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Vai trò</label>
          <input className="admin-input" value="Sản xuất" readOnly disabled />
        </div>
      </form>
    </AdminQuickCreateShell>
  );
}
