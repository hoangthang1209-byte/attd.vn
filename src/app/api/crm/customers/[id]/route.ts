import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerById,
  isValidCustomerStatus,
  isValidCustomerType,
  updateCustomer,
} from "@/features/crm/services/crm-customer.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

function parseOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const customer = await getCustomerById(id);

  if (!customer) {
    return NextResponse.json({ message: "Không tìm thấy khách hàng" }, { status: 404 });
  }

  return NextResponse.json({ customer });
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
  const patch: Parameters<typeof updateCustomer>[1] = {};

  if (raw.type !== undefined) {
    if (typeof raw.type !== "string" || !isValidCustomerType(raw.type)) {
      return NextResponse.json({ message: "Loại khách không hợp lệ" }, { status: 400 });
    }
    patch.type = raw.type;
  }
  if (raw.status !== undefined) {
    if (typeof raw.status !== "string" || !isValidCustomerStatus(raw.status)) {
      return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
    }
    patch.status = raw.status;
  }
  if (raw.name !== undefined) {
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) {
      return NextResponse.json({ message: "Tên khách hàng là bắt buộc" }, { status: 400 });
    }
    patch.name = name;
  }
  if (raw.legalName !== undefined) patch.legalName = parseOptionalString(raw.legalName);
  if (raw.taxCode !== undefined) patch.taxCode = parseOptionalString(raw.taxCode);
  if (raw.phone !== undefined) patch.phone = parseOptionalString(raw.phone);
  if (raw.email !== undefined) patch.email = parseOptionalString(raw.email);
  if (raw.website !== undefined) patch.website = parseOptionalString(raw.website);
  if (raw.address !== undefined) patch.address = parseOptionalString(raw.address);
  if (raw.province !== undefined) patch.province = parseOptionalString(raw.province);
  if (raw.district !== undefined) patch.district = parseOptionalString(raw.district);
  if (raw.provinceId !== undefined) patch.provinceId = parseOptionalString(raw.provinceId);
  if (raw.wardId !== undefined) patch.wardId = parseOptionalString(raw.wardId);
  if (raw.provinceNameSnapshot !== undefined) {
    patch.provinceNameSnapshot = parseOptionalString(raw.provinceNameSnapshot);
  }
  if (raw.wardNameSnapshot !== undefined) patch.wardNameSnapshot = parseOptionalString(raw.wardNameSnapshot);
  if (raw.addressLine1 !== undefined) patch.addressLine1 = parseOptionalString(raw.addressLine1);
  if (raw.addressLine2 !== undefined) patch.addressLine2 = parseOptionalString(raw.addressLine2);
  if (raw.note !== undefined) patch.note = parseOptionalString(raw.note);
  if (raw.internalNote !== undefined) patch.internalNote = parseOptionalString(raw.internalNote);
  if (raw.billingNote !== undefined) patch.billingNote = parseOptionalString(raw.billingNote);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: "Không có dữ liệu cập nhật" }, { status: 400 });
  }

  try {
    const customer = await updateCustomer(id, patch);
    if (!customer) {
      return NextResponse.json({ message: "Không tìm thấy khách hàng" }, { status: 404 });
    }
    return NextResponse.json({ customer });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể cập nhật khách hàng" },
      { status: 400 },
    );
  }
}
