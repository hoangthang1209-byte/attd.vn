import { NextRequest, NextResponse } from "next/server";
import { bulkUpdateCustomers } from "@/features/crm/services/customer-bulk-update.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/errors/permission-errors";

export const dynamic = "force-dynamic";

async function requireCustomerBulkUpdatePermission(request: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "update",
    request,
  });
  if (permission.ok) return { response: null, userId: permission.user.userId ?? permission.user.username ?? null };
  if (permission.response.status === 401) {
    return {
      response: unauthorizedResponse("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."),
      userId: null,
    };
  }
  return {
    response: forbiddenResponse("Bạn không có quyền cập nhật khách hàng."),
    userId: null,
  };
}

export async function PATCH(request: NextRequest) {
  const permission = await requireCustomerBulkUpdatePermission(request);
  if (permission.response) return permission.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  try {
    const raw = body as { customerIds?: unknown; patch?: unknown };
    const result = await bulkUpdateCustomers({
      customerIds: raw.customerIds,
      patch: raw.patch,
      actorId: permission.userId,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể cập nhật khách hàng.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
