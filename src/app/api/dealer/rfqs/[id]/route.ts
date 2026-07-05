import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { dealerApiError, parseOptionalString } from "@/features/dealer/dealer-api-utils";
import {
  getDealerRFQById,
  updateDealerRFQ,
} from "@/features/dealer/services/dealer-rfq.service";
import {
  isValidDealerRFQPriority,
  isValidDealerRFQProjectType,
} from "@/features/dealer/dealer-rfq.validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  const { id } = await params;
  try {
    const rfq = await getDealerRFQById(id);
    if (!rfq) {
      return NextResponse.json({ message: "Không tìm thấy yêu cầu báo giá." }, { status: 404 });
    }
    return NextResponse.json({ rfq });
  } catch (err) {
    return dealerApiError(err, "Không thể tải RFQ.");
  }
}

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
  try {
    const rfq = await updateDealerRFQ(id, {
      title: typeof raw.title === "string" ? raw.title : undefined,
      projectType:
        typeof raw.projectType === "string" && isValidDealerRFQProjectType(raw.projectType)
          ? raw.projectType
          : undefined,
      priority:
        typeof raw.priority === "string" && isValidDealerRFQPriority(raw.priority)
          ? raw.priority
          : undefined,
      internalNote: raw.internalNote !== undefined ? parseOptionalString(raw.internalNote) : undefined,
      assignedToAdminUserId:
        typeof raw.assignedToAdminUserId === "string" ? raw.assignedToAdminUserId : undefined,
    });
    return NextResponse.json({ rfq });
  } catch (err) {
    return dealerApiError(err, "Không thể cập nhật RFQ.");
  }
}
