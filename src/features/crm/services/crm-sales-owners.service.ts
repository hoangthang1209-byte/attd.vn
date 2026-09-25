import { listEmployees } from "@/features/employees/employee.service";

export type CrmSalesOwnerOption = {
  id: string;
  fullName: string;
  employeeCode: string;
};

export async function listCrmSalesOwners(): Promise<{
  salesOwners: CrmSalesOwnerOption[];
  total: number;
}> {
  const result = await listEmployees({
    activeOnly: true,
    salesCapableOnly: true,
    limit: 200,
  });

  return {
    salesOwners: result.employees.map((employee) => ({
      id: employee.id,
      fullName: employee.fullName,
      employeeCode: employee.employeeCode,
    })),
    total: result.total,
  };
}
