import type { Prisma } from "@prisma/client";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { can, canViewOrderFinancials, getPermissionScope } from "@/features/auth/admin-permissions";
import { buildScopedOrderWhere } from "@/features/auth/order-scope";
import type { CrmReportFilters, CrmReportingMeta } from "@/features/crm/reporting.types";
import { toRangeLabel } from "@/features/crm/services/crm-reporting-utils";

const NO_ACCESS = "__report_no_access__";

export function assertCanViewReports(session: AdminSessionUser): void {
  if (!session.authenticated || !can(session, "crm.view")) {
    throw new Error("FORBIDDEN");
  }
  if (!can(session, "reports.view") && session.roleCode !== "OWNER" && session.roleCode !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
}

function scopedEmployeeId(session: AdminSessionUser, filters: CrmReportFilters): string | null {
  const crmScope = getPermissionScope(session, "crm.view");
  if (crmScope === "OWN") {
    return session.employeeId;
  }
  return filters.salesOwnerId ?? null;
}

export function buildReportingScope(
  session: AdminSessionUser,
  filters: CrmReportFilters,
): {
  leadWhere: Prisma.LeadWhereInput;
  quoteWhere: Prisma.QuoteWhereInput;
  orderWhere: Prisma.OrderWhereInput;
  customerWhere: Prisma.CustomerWhereInput;
  meta: CrmReportingMeta;
  scopedEmployeeId: string | null;
} {
  const employeeId = scopedEmployeeId(session, filters);

  const leadWhere: Prisma.LeadWhereInput = {
    createdAt: { gte: filters.from, lt: filters.to },
    ...(filters.leadSource ? { source: filters.leadSource as never } : {}),
    ...(filters.leadStatus ? { status: filters.leadStatus } : {}),
    ...(employeeId ? { assignedTo: employeeId } : {}),
  };

  const quoteWhere: Prisma.QuoteWhereInput = {
    createdAt: { gte: filters.from, lt: filters.to },
    ...(employeeId
      ? {
          OR: [
            { lead: { assignedTo: employeeId } },
            { salesRepresentative: { employeeId } },
            { order: { salesEmployeeId: employeeId } },
          ],
        }
      : {}),
  };

  const orderScope = buildScopedOrderWhere(session, "orders.view");
  const orderWhere: Prisma.OrderWhereInput = {
    createdAt: { gte: filters.from, lt: filters.to },
    ...(employeeId ? { salesEmployeeId: employeeId } : {}),
    ...(orderScope.id === NO_ACCESS ? { id: NO_ACCESS } : orderScope),
  };

  const customerWhere: Prisma.CustomerWhereInput = {
    createdAt: { gte: filters.from, lt: filters.to },
    ...(filters.customerType ? { type: filters.customerType } : {}),
    ...(employeeId
      ? {
          OR: [
            { leads: { some: { assignedTo: employeeId } } },
            { quotes: { some: { salesRepresentative: { employeeId } } } },
            { orders: { some: { salesEmployeeId: employeeId } } },
          ],
        }
      : {}),
  };

  return {
    leadWhere,
    quoteWhere,
    orderWhere,
    customerWhere,
    scopedEmployeeId: employeeId,
    meta: {
      canViewFinancials: canViewOrderFinancials(session),
      canSelectAnySalesOwner: getPermissionScope(session, "crm.view") !== "OWN",
      selectedSalesOwnerId: employeeId,
      rangeLabel: toRangeLabel(filters),
    },
  };
}
