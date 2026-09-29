import type { EmployeeRole } from "@prisma/client";

export const EMPLOYEE_ROLES: EmployeeRole[] = [
  "SALES",
  "PRODUCTION",
  "DELIVERY",
  "ADMIN",
  "OTHER",
];

export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  SALES: "Kinh doanh",
  PRODUCTION: "Sản xuất",
  DELIVERY: "Giao hàng",
  ADMIN: "Quản trị",
  OTHER: "Khác",
};

export function isEmployeeRole(value: string): value is EmployeeRole {
  return EMPLOYEE_ROLES.includes(value as EmployeeRole);
}

/** Roles eligible for CRM lead ownership (matches resolveSalesEmployeeSnapshot). */
export const SALES_CAPABLE_EMPLOYEE_ROLES: EmployeeRole[] = ["SALES", "ADMIN"];

export function isSalesCapableEmployeeRole(
  role: EmployeeRole | null | undefined
): boolean {
  return !role || SALES_CAPABLE_EMPLOYEE_ROLES.includes(role);
}

export function employeeRoleLabel(role: EmployeeRole | null | undefined): string {
  if (!role) return "—";
  return EMPLOYEE_ROLE_LABELS[role] ?? role;
}
