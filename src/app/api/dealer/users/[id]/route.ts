import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  dealerApiError,
  parseOptionalString,
} from "@/features/dealer/dealer-api-utils";
import {
  isValidDealerUserRole,
  isValidDealerUserStatus,
} from "@/features/dealer/dealer-validation";
import { updateDealerUser } from "@/features/dealer/services/dealer-user.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "dealer",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Thiếu dữ liệu yêu cầu." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const role =
    typeof raw.role === "string" && isValidDealerUserRole(raw.role) ? raw.role : undefined;
  const status =
    typeof raw.status === "string" && isValidDealerUserStatus(raw.status) ? raw.status : undefined;

  try {
    const user = await updateDealerUser(id, {
      name: typeof raw.name === "string" ? raw.name : undefined,
      email: typeof raw.email === "string" ? raw.email : undefined,
      phone: raw.phone !== undefined ? parseOptionalString(raw.phone) : undefined,
      role,
      status,
    });
    return NextResponse.json({ user });
  } catch (err) {
    return dealerApiError(err, "Không thể cập nhật người dùng đại lý.");
  }
}
