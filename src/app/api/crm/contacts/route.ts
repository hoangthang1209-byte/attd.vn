import { NextRequest, NextResponse } from "next/server";
import { createContact, setPrimaryContact } from "@/features/crm/services/crm-customer.service";

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
  const customerId = typeof raw.customerId === "string" ? raw.customerId : "";
  const fullName = typeof raw.fullName === "string" ? raw.fullName.trim() : "";

  if (!customerId) {
    return NextResponse.json({ message: "Thiếu customerId" }, { status: 400 });
  }
  if (!fullName) {
    return NextResponse.json({ message: "Họ tên là bắt buộc" }, { status: 400 });
  }

  const customer = await createContact({
    customerId,
    fullName,
    title: typeof raw.title === "string" ? raw.title : null,
    phone: typeof raw.phone === "string" ? raw.phone : null,
    email: typeof raw.email === "string" ? raw.email : null,
    zalo: typeof raw.zalo === "string" ? raw.zalo : null,
    isPrimary: raw.isPrimary === true,
    note: typeof raw.note === "string" ? raw.note : null,
  });

  if (!customer) {
    return NextResponse.json({ message: "Không thể tạo liên hệ" }, { status: 500 });
  }

  return NextResponse.json({ customer }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
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
  const customerId = typeof raw.customerId === "string" ? raw.customerId : "";
  const contactId = typeof raw.contactId === "string" ? raw.contactId : "";

  if (!customerId || !contactId) {
    return NextResponse.json({ message: "Thiếu customerId hoặc contactId" }, { status: 400 });
  }

  const customer = await setPrimaryContact(customerId, contactId);

  if (!customer) {
    return NextResponse.json({ message: "Không thể cập nhật liên hệ chính" }, { status: 500 });
  }

  return NextResponse.json({ customer });
}
