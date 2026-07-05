import { NextRequest, NextResponse } from "next/server";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import { transitionPurchaseRequestStatus } from "@/features/materials/purchase-request.service";
import type { PurchaseRequestStatus } from "@prisma/client";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

const STATUSES: PurchaseRequestStatus[] = [
  "DRAFT",
  "REQUESTED",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const status =
    typeof raw.status === "string" && STATUSES.includes(raw.status as PurchaseRequestStatus)
      ? (raw.status as PurchaseRequestStatus)
      : null;

  if (!status) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ." }, { status: 400 });
  }

  try {
    const request = await transitionPurchaseRequestStatus(id, status);
    return NextResponse.json({ request });
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/purchase-requests/[id]/status]", err);
    return NextResponse.json({ message: "Không thể cập nhật trạng thái." }, { status: 500 });
  }
}
