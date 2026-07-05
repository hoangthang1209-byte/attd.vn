import { NextRequest, NextResponse } from "next/server";
import {
  deleteContact,
  updateContact,
} from "@/features/crm/services/crm-contact.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id: customerId, contactId } = await ctx.params;
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
  try {
    const contact = await updateContact(customerId, contactId, {
      ...(raw.fullName !== undefined
        ? { fullName: typeof raw.fullName === "string" ? raw.fullName : "" }
        : {}),
      ...(raw.title !== undefined ? { title: typeof raw.title === "string" ? raw.title : null } : {}),
      ...(raw.department !== undefined
        ? { department: typeof raw.department === "string" ? raw.department : null }
        : {}),
      ...(raw.phone !== undefined ? { phone: typeof raw.phone === "string" ? raw.phone : null } : {}),
      ...(raw.email !== undefined ? { email: typeof raw.email === "string" ? raw.email : null } : {}),
      ...(raw.zalo !== undefined ? { zalo: typeof raw.zalo === "string" ? raw.zalo : null } : {}),
      ...(raw.note !== undefined ? { note: typeof raw.note === "string" ? raw.note : null } : {}),
      ...(raw.isPrimary !== undefined ? { isPrimary: raw.isPrimary === true } : {}),
    });
    if (!contact) {
      return NextResponse.json({ message: "Không tìm thấy người liên hệ" }, { status: 404 });
    }
    return NextResponse.json({ contact });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể cập nhật người liên hệ" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id: customerId, contactId } = await ctx.params;
  try {
    await deleteContact(customerId, contactId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể xóa người liên hệ" },
      { status: 400 },
    );
  }
}
