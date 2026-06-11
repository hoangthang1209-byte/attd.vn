import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

  const lead = await prisma.lead.create({
    data: {
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
      company: body.company?.trim() || null,
      message: body.message?.trim() || null,
      source: "CONTACT_FORM",
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
