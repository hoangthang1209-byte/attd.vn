import { NextRequest, NextResponse } from "next/server";
import type { CustomerStatus, CustomerType } from "@prisma/client";
import {
  createCustomer,
  isValidCustomerStatus,
  isValidCustomerType,
  listCustomers,
} from "@/features/crm/services/crm-customer.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const typeParam = searchParams.get("type") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;

  if (typeParam && !isValidCustomerType(typeParam)) {
    return NextResponse.json({ message: "Loại khách không hợp lệ" }, { status: 400 });
  }
  if (statusParam && !isValidCustomerStatus(statusParam)) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  try {
    const result = await listCustomers({
      search,
      type: typeParam as CustomerType | undefined,
      status: statusParam as CustomerStatus | undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/crm/customers]", err);
    return NextResponse.json({ message: "Không thể tải khách hàng" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) {
    return NextResponse.json({ message: "Tên khách hàng là bắt buộc" }, { status: 400 });
  }

  const type =
    typeof raw.type === "string" && isValidCustomerType(raw.type) ? raw.type : undefined;
  const status =
    typeof raw.status === "string" && isValidCustomerStatus(raw.status)
      ? raw.status
      : undefined;

  let primaryContact = null;
  if (raw.primaryContact && typeof raw.primaryContact === "object") {
    const pc = raw.primaryContact as Record<string, unknown>;
    const fullName = typeof pc.fullName === "string" ? pc.fullName.trim() : "";
    if (fullName) {
      primaryContact = {
        fullName,
        title: typeof pc.title === "string" ? pc.title : null,
        phone: typeof pc.phone === "string" ? pc.phone : null,
        email: typeof pc.email === "string" ? pc.email : null,
        zalo: typeof pc.zalo === "string" ? pc.zalo : null,
        note: typeof pc.note === "string" ? pc.note : null,
      };
    }
  }

  const customer = await createCustomer({
    type,
    name,
    legalName: typeof raw.legalName === "string" ? raw.legalName : null,
    taxCode: typeof raw.taxCode === "string" ? raw.taxCode : null,
    phone: typeof raw.phone === "string" ? raw.phone : null,
    email: typeof raw.email === "string" ? raw.email : null,
    website: typeof raw.website === "string" ? raw.website : null,
    address: typeof raw.address === "string" ? raw.address : null,
    province: typeof raw.province === "string" ? raw.province : null,
    district: typeof raw.district === "string" ? raw.district : null,
    status,
    note: typeof raw.note === "string" ? raw.note : null,
    primaryContact,
  });

  if (!customer) {
    return NextResponse.json({ message: "Không thể tạo khách hàng" }, { status: 500 });
  }

  return NextResponse.json({ customer }, { status: 201 });
}
