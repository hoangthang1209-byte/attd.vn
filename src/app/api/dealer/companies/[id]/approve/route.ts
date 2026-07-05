import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { dealerApiError, parseOptionalString } from "@/features/dealer/dealer-api-utils";
import { isValidDealerLevel } from "@/features/dealer/dealer-validation";
import { approveDealerCompany } from "@/features/dealer/services/dealer-company.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "dealer",
    action: "approve",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    // optional body
  }

  const level =
    typeof body.level === "string" && isValidDealerLevel(body.level) ? body.level : undefined;
  const priceGroupId = parseOptionalString(body.priceGroupId);

  try {
    const session = await getAdminSessionFromCookies();
    const approvedBy =
      session.username ??
      session.employeeId ??
      (session.mode === "owner" ? "owner" : null);

    const company = await approveDealerCompany(id, {
      approvedBy,
      level,
      priceGroupId,
    });
    return NextResponse.json({ company, message: "Đã duyệt đại lý." });
  } catch (err) {
    return dealerApiError(err, "Không thể duyệt đại lý.");
  }
}
