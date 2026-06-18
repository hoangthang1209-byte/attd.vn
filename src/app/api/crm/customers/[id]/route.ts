import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerById,
  isValidCustomerStatus,
  isValidCustomerType,
  updateCustomer,
} from "@/features/crm/services/crm-customer.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const customer = await getCustomerById(id);

  if (!customer) {
    return NextResponse.json({ message: "Không tìm thấy khách hàng" }, { status: 404 });
  }

  return NextResponse.json({ customer });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
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
  if (raw.legalName !== undefined) patch.legalName = typeof raw.legalName === "string" ? raw.legalName : null;
  if (raw.taxCode !== undefined) patch.taxCode = typeof raw.taxCode === "string" ? raw.taxCode : null;
  if (raw.phone !== undefined) patch.phone = typeof raw.phone === "string" ? raw.phone : null;
  if (raw.email !== undefined) patch.email = typeof raw.email === "string" ? raw.email : null;
  if (raw.website !== undefined) patch.website = typeof raw.website === "string" ? raw.website : null;
  if (raw.address !== undefined) patch.address = typeof raw.address === "string" ? raw.address : null;
  if (raw.province !== undefined) patch.province = typeof raw.province === "string" ? raw.province : null;
  if (raw.district !== undefined) patch.district = typeof raw.district === "string" ? raw.district : null;
  if (raw.note !== undefined) patch.note = typeof raw.note === "string" ? raw.note : null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: "Không có dữ liệu cập nhật" }, { status: 400 });
  }

  const customer = await updateCustomer(id, patch);
  if (!customer) {
    return NextResponse.json({ message: "Không tìm thấy khách hàng" }, { status: 404 });
  }

  return NextResponse.json({ customer });
}
