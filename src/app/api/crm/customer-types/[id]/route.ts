import { NextRequest, NextResponse } from "next/server";
import {
  deleteCustomerType,
  getCustomerTypeById,
  updateCustomerType,
} from "@/features/crm/services/customer-type.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const type = await getCustomerTypeById(id);
  if (!type) {
    return NextResponse.json({ message: "Không tìm thấy loại khách hàng" }, { status: 404 });
  }
  return NextResponse.json({ type });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const patch: Parameters<typeof updateCustomerType>[1] = {};
  if (raw.name !== undefined) patch.name = typeof raw.name === "string" ? raw.name : "";
  if (raw.description !== undefined) {
    patch.description = typeof raw.description === "string" ? raw.description : null;
  }
  if (raw.sortOrder !== undefined) {
    patch.sortOrder =
      typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder) ? raw.sortOrder : 0;
  }
  if (raw.isActive !== undefined) patch.isActive = Boolean(raw.isActive);

  try {
    const type = await updateCustomerType(id, patch);
    return NextResponse.json({ type });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể cập nhật loại khách hàng" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    await deleteCustomerType(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể xóa loại khách hàng" },
      { status: 400 },
    );
  }
}
