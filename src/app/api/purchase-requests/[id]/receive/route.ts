import { NextRequest, NextResponse } from "next/server";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import { receivePurchaseRequestItems } from "@/features/materials/purchase-request.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

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
  const receives = Array.isArray(raw.receives) ? raw.receives : [];

  try {
    const request = await receivePurchaseRequestItems(
      id,
      receives.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          itemId: typeof row.itemId === "string" ? row.itemId : "",
          quantity: row.quantity != null ? String(row.quantity) : "0",
          note: typeof row.note === "string" ? row.note : null,
          createdByEmployeeId:
            typeof row.createdByEmployeeId === "string" ? row.createdByEmployeeId : null,
        };
      }),
    );
    return NextResponse.json({ request });
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/purchase-requests/[id]/receive]", err);
    return NextResponse.json({ message: "Không thể ghi nhận hàng về." }, { status: 500 });
  }
}
