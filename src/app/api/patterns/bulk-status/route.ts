import { NextRequest, NextResponse } from "next/server";
import { PatternStatus } from "@prisma/client";
import { setAllPatternStatuses } from "@/features/patterns/pattern.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "tech-pack",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const status = typeof raw.status === "string" ? raw.status : "";
  if (!Object.values(PatternStatus).includes(status as PatternStatus)) {
    return NextResponse.json({ message: "Trạng thái rập không hợp lệ." }, { status: 400 });
  }

  try {
    const result = await setAllPatternStatuses(
      status as PatternStatus,
      auth.session.username ?? auth.session.employeeId,
    );
    return NextResponse.json({
      ok: true,
      updated: result.updated,
      message: `Đã cập nhật trạng thái cho ${result.updated} rập.`,
    });
  } catch (err) {
    console.error("[POST /api/patterns/bulk-status]", err);
    return NextResponse.json(
      { message: "Không thể cập nhật trạng thái toàn bộ rập." },
      { status: 500 },
    );
  }
}
