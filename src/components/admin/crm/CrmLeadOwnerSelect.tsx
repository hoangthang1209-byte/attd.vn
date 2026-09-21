"use client";

import { useEffect, useState } from "react";

type EmployeeOption = {
  id: string;
  fullName: string;
  employeeCode: string;
};

type Props = {
  value: string | null;
  onChange: (employeeId: string | null) => void;
  disabled?: boolean;
};

export default function CrmLeadOwnerSelect({ value, onChange, disabled }: Props) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/employees?active=1&salesCapable=1&limit=200");
        const data = await res.json();
        if (!cancelled && Array.isArray(data.employees)) {
          setEmployees(data.employees);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <label>
      Phụ trách sales
      <select
        className="admin-input"
        value={value ?? ""}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Chưa phân công</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.fullName} ({employee.employeeCode})
          </option>
        ))}
      </select>
    </label>
  );
}

export function resolveEmployeeLabel(
  employees: EmployeeOption[],
  employeeId: string | null | undefined
): string {
  if (!employeeId) return "—";
  const match = employees.find((e) => e.id === employeeId);
  return match ? `${match.fullName} (${match.employeeCode})` : employeeId;
}
