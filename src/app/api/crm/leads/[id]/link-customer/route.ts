import { NextRequest, NextResponse } from "next/server";
import { linkLeadToExistingCustomer } from "@/features/crm/services/crm-lead.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
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
  const customerId = typeof raw.customerId === "string" ? raw.customerId.trim() : "";

  if (!customerId) {
    return NextResponse.json({ message: "Vui lòng chọn khách hàng" }, { status: 400 });
  }

  const lead = await linkLeadToExistingCustomer(id, {
    customerId,
    createContact: raw.createContact !== false,
    contactId: typeof raw.contactId === "string" ? raw.contactId : null,
  });

  if (!lead) {
    return NextResponse.json(
      {
        message:
          "Không thể gắn lead. Lead có thể đã được liên kết hoặc khách hàng không tồn tại.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ lead });
}
