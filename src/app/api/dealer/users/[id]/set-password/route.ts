import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import { setDealerUserPassword } from "@/features/dealer/auth/dealer-auth.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "dealer",
    action: "admin",
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

  const password =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).password === "string"
      ? (body as Record<string, string>).password
      : "";

  if (!password.trim()) {
    return NextResponse.json({ message: "Mật khẩu là bắt buộc." }, { status: 400 });
  }

  try {
    const user = await setDealerUserPassword(id, password);
    return NextResponse.json({
      ok: true,
      user,
      message: "Đã đặt mật khẩu tạm thời cho người dùng B2B.",
    });
  } catch (err) {
    return dealerApiError(err, "Không thể đặt mật khẩu.");
  }
}
