import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  dealerApiError,
  parseOptionalString,
} from "@/features/dealer/dealer-api-utils";
import {
  isValidDealerUserRole,
  isValidDealerUserStatus,
} from "@/features/dealer/dealer-validation";
import {
  createDealerUser,
  listDealerUsers,
} from "@/features/dealer/services/dealer-user.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  const { id } = await params;
  try {
    const result = await listDealerUsers(id);
    return NextResponse.json(result);
  } catch (err) {
    return dealerApiError(err, "Không thể tải người dùng đại lý.");
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "dealer",
    action: "create",
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
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  if (!name || !email) {
    return NextResponse.json({ message: "Tên và email là bắt buộc." }, { status: 400 });
  }

  const role =
    typeof raw.role === "string" && isValidDealerUserRole(raw.role) ? raw.role : undefined;
  const status =
    typeof raw.status === "string" && isValidDealerUserStatus(raw.status) ? raw.status : undefined;

  try {
    const user = await createDealerUser(id, {
      name,
      email,
      phone: parseOptionalString(raw.phone),
      role,
      status,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return dealerApiError(err, "Không thể tạo người dùng đại lý.");
  }
}
