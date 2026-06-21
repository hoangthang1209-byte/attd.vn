"use client";

import { useState } from "react";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import QuickAddProductionEmployeeModal from "@/components/admin/employees/QuickAddProductionEmployeeModal";
import type { EmployeeRecord } from "@/features/employees/employee.service";

type Props = {
  value: string;
  onChange: (value: string) => void;
  employees: EmployeeRecord[];
  onEmployeesChange: (employees: EmployeeRecord[]) => void;
  legacyOwnerName?: string | null;
  disabled?: boolean;
  onEmployeeCreated?: (employee: EmployeeRecord) => void;
};

export default function ProductionOwnerSelect({
  value,
  onChange,
  employees,
  onEmployeesChange,
  legacyOwnerName,
  disabled = false,
  onEmployeeCreated,
}: Props) {
  const [quickOpen, setQuickOpen] = useState(false);
  const hasProductionEmployees = employees.length > 0;

  const options = employees.map((emp) => ({
    value: emp.id,
    label: emp.fullName,
    sublabel: emp.employeeCode,
  }));

  function handleCreated(employee: EmployeeRecord) {
    const next = [...employees.filter((e) => e.id !== employee.id), employee];
    onEmployeesChange(next);
    onChange(employee.id);
    onEmployeeCreated?.(employee);
  }

  return (
    <div className="admin-master-select">
      {!hasProductionEmployees && !legacyOwnerName ? (
        <p className="admin-empty-state">Chưa có nhân viên Sản xuất</p>
      ) : (
        <AdminSearchableSelect
          value={value}
          onChange={onChange}
          options={options}
          placeholder="— Chọn nhân viên —"
          searchPlaceholder="Tìm nhân viên sản xuất…"
          disabled={disabled || (!hasProductionEmployees && !value)}
          emptyMessage={!hasProductionEmployees ? "Chưa có nhân viên Sản xuất" : undefined}
        />
      )}
      {legacyOwnerName && !value && (
        <p className="admin-field-hint admin-legacy-hint">
          <span className="admin-legacy-label">Dữ liệu cũ:</span> {legacyOwnerName}
        </p>
      )}
      <button
        type="button"
        className="admin-btn admin-btn--link admin-master-select__action"
        onClick={() => setQuickOpen(true)}
        disabled={disabled}
      >
        Thêm nhân viên sản xuất
      </button>
      <QuickAddProductionEmployeeModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
