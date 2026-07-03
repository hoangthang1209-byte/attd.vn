import "server-only";

import type { Prisma } from "@prisma/client";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { getPermissionScope } from "@/features/auth/admin-permissions";
import { buildScopedOrderWhere } from "@/features/auth/order-scope";

const NO_ACCESS: Prisma.OrderWhereInput = { id: "__no_access__" };

export function buildProductionPlanOrderWhere(
  session: AdminSessionUser,
): Prisma.OrderWhereInput {
  return buildScopedOrderWhere(session, "production.view");
}

export function canEditProductionPlan(session: AdminSessionUser): boolean {
  const updateScope = getPermissionScope(session, "production.update");
  return updateScope === "ALL" || updateScope === "TEAM";
}

export function canAssignProductionOwner(session: AdminSessionUser): boolean {
  return canEditProductionPlan(session);
}

export function matchesProductionJobAssignment(input: {
  session: AdminSessionUser;
  orderProductionOwnerId: string | null;
  planProductionOwnerId: string | null;
  salesEmployeeId: string | null;
}): boolean {
  const scope = getPermissionScope(input.session, "production.view");
  if (scope === "NONE") return false;
  if (scope === "ALL" || scope === "TEAM") return true;

  const employeeId = input.session.employeeId;
  if (!employeeId) return false;

  if (scope === "OWN") {
    return input.salesEmployeeId === employeeId;
  }

  if (scope === "ASSIGNED") {
    return (
      input.planProductionOwnerId === employeeId ||
      input.orderProductionOwnerId === employeeId ||
      input.salesEmployeeId === employeeId
    );
  }

  return false;
}

export function buildAssignedJobFilter(
  session: AdminSessionUser,
): Prisma.OrderItemWhereInput | null {
  const scope = getPermissionScope(session, "production.view");
  if (scope === "ALL" || scope === "TEAM") return null;

  const employeeId = session.employeeId;
  if (!employeeId) return { id: "__no_access__" };

  if (scope === "OWN") {
    return { order: { salesEmployeeId: employeeId } };
  }

  if (scope === "ASSIGNED") {
    return {
      OR: [
        { productionPlan: { productionOwnerId: employeeId } },
        { order: { productionOwnerId: employeeId } },
        { order: { salesEmployeeId: employeeId } },
      ],
    };
  }

  return { id: "__no_access__" };
}

export function productionOrderStatusesWhere(): Prisma.OrderWhereInput {
  return {
    status: { in: ["CONFIRMED", "IN_PRODUCTION", "READY_TO_SHIP"] },
  };
}

export { NO_ACCESS };
