import { NextResponse } from "next/server";
import { canViewOrderFinancials } from "@/features/auth/order-financial-permissions";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";

export async function GET() {
  const session = await getAdminSessionFromCookies();
  if (!session.authenticated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    employeeId: session.employeeId,
    role: session.role,
    permissions: {
      canViewFinancials: canViewOrderFinancials(session),
      canAccessQuotes: canViewOrderFinancials(session),
      canAccessPricing: canViewOrderFinancials(session),
    },
  });
}
