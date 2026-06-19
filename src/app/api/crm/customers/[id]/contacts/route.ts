import { NextRequest, NextResponse } from "next/server";
import { createContact } from "@/features/crm/services/crm-customer.service";
import { listCustomerContacts } from "@/features/crm/services/crm-contact.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const contacts = await listCustomerContacts(id);
  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: customerId } = await ctx.params;
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
  const fullName = typeof raw.fullName === "string" ? raw.fullName.trim() : "";
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
  });

  if (!customer) {
    return NextResponse.json({ message: "Không thể tạo người liên hệ" }, { status: 500 });
  }

  const contact =
    customer.contacts?.find((c) => c.fullName === fullName) ??
    customer.contacts?.[customer.contacts.length - 1];

  if (!contact) {
    return NextResponse.json({ message: "Không thể tạo người liên hệ" }, { status: 500 });
  }

  return NextResponse.json({ contact }, { status: 201 });
}
