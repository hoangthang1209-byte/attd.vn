import type { Prisma } from "@prisma/client";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { getPermissionScope } from "@/features/auth/admin-permissions";

export type OrderScopeFields = {
  salesEmployeeId: string | null;
  productionOwnerId: string | null;
  deliveryOwnerId: string | null;
};

const NO_ACCESS_WHERE: Prisma.OrderWhereInput = { id: "__no_access__" };

function employeeIdOrNone(session: AdminSessionUser): string | null {
  return session.employeeId;
}

export function matchesOrderScope(
  session: AdminSessionUser,
  order: OrderScopeFields,
  permissionCode: string,
): boolean {
  const scope = getPermissionScope(session, permissionCode);
  if (scope === "NONE") return false;
  if (scope === "ALL" || scope === "TEAM") return true;

  const employeeId = employeeIdOrNone(session);
  if (!employeeId) return false;

  if (scope === "OWN") {
    return order.salesEmployeeId === employeeId;
  }

  if (scope === "ASSIGNED") {
    return (
      order.productionOwnerId === employeeId ||
      order.deliveryOwnerId === employeeId ||
      order.salesEmployeeId === employeeId
    );
  }

  return false;
}

export function buildScopedOrderWhere(
  session: AdminSessionUser,
  permissionCode = "orders.view",
): Prisma.OrderWhereInput {
  const scope = getPermissionScope(session, permissionCode);
  if (scope === "NONE") return NO_ACCESS_WHERE;
  if (scope === "ALL" || scope === "TEAM") return {};

  const employeeId = employeeIdOrNone(session);
  if (!employeeId) return NO_ACCESS_WHERE;

  if (scope === "OWN") {
    return { salesEmployeeId: employeeId };
  }

  if (scope === "ASSIGNED") {
    return {
      OR: [
        { productionOwnerId: employeeId },
        { deliveryOwnerId: employeeId },
        { salesEmployeeId: employeeId },
      ],
    };
  }

  return NO_ACCESS_WHERE;
}

export function canAccessOrderRecord(
  session: AdminSessionUser,
  order: OrderScopeFields,
  permissionCode = "orders.view",
): boolean {
  return matchesOrderScope(session, order, permissionCode);
}

export function canViewOrderFinancialsForRecord(
  session: AdminSessionUser,
  order: OrderScopeFields,
): boolean {
  return matchesOrderScope(session, order, "orders.view_financials");
}
