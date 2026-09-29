import { getEmployeeById as defaultGetEmployeeById } from "@/features/employees/employee.service";

export const crmOwnerValidationDeps = {
  getEmployeeById: defaultGetEmployeeById,
};

export function resetCrmOwnerValidationDeps(): void {
  crmOwnerValidationDeps.getEmployeeById = defaultGetEmployeeById;
}
