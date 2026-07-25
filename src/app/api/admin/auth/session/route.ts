import { NextResponse } from "next/server";
import { can, canManageRolesPermissions, canManageUsers, canViewOrderFinancials } from "@/features/auth/admin-permissions";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";

export async function GET() {
  const session = await getAdminSessionFromCookies();
  if (!session.authenticated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const permissionMap = Object.fromEntries(session.permissions.entries());

  return NextResponse.json({
    mode: session.mode,
    userId: session.userId,
    username: session.username,
    employeeId: session.employeeId,
    roleId: session.roleId,
    roleCode: session.roleCode,
    legacyEmployeeRole: session.legacyEmployeeRole,
    permissions: permissionMap,
    flags: {
      canViewFinancials: canViewOrderFinancials(session),
      canAccessQuotes: can(session, "quotes.view"),
      canAccessPricing: can(session, "pricing.manage"),
      canManageUsers: canManageUsers(session),
      canManageRoles: canManageRolesPermissions(session),
      canViewOrders: can(session, "orders.view"),
      canCreateOrders: can(session, "orders.create"),
      canUpdateOrders: can(session, "orders.update"),
      canViewProduction: can(session, "production.view"),
      canUpdateProduction: can(session, "production.update"),
      canViewItemProduction:
        can(session, "manufacturing.production.view") || can(session, "production.view"),
      canUpdateItemProduction:
        can(session, "manufacturing.production.update") || can(session, "production.update"),
      canViewDelivery: can(session, "delivery.view"),
      canManageEmployees: can(session, "employees.manage"),
      canManageProducts: can(session, "products.manage"),
      canManageCms: can(session, "cms.manage"),
      canViewCrm: can(session, "crm.view"),
      canViewDashboard: can(session, "dashboard.view"),
      canViewWarehouse: can(session, "warehouse.view"),
      canViewReports: can(session, "reports.view"),
      canManageManufacturingLibrary: can(session, "manufacturingAsset.view"),
    },
  });
}
