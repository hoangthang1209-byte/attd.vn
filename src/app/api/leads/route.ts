import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createCrmLead } from "@/features/crm/services/crm-lead.service";

export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json(
      { message: "Họ tên là bắt buộc" },
      { status: 400 }
    );
  }
  if (!body.phone?.trim()) {
    return NextResponse.json(
      { message: "Số điện thoại là bắt buộc" },
      { status: 400 }
    );
  }

  const fullName = body.name.trim();
  const phone = body.phone.trim();
  const email = body.email?.trim() || null;
  const company = body.company?.trim() || null;
  const message = body.message?.trim() || null;

  const lead = await createCrmLead({
    fullName,
    phone,
    email,
    company,
    source: "CONTACT",
    message,
  });

  if (!lead) {
    return NextResponse.json(
      { message: "Không thể lưu lead. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  return NextResponse.json(lead, { status: 201 });
}
