import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const dealers = await prisma.dealer.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(dealers);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.contactName?.trim()) {
    return NextResponse.json(
      { message: "Họ tên là bắt buộc" },
      { status: 400 }
    );
  }
  if (!body.companyName?.trim()) {
    return NextResponse.json(
      { message: "Tên công ty là bắt buộc" },
      { status: 400 }
    );
  }
  if (!body.phone?.trim()) {
    return NextResponse.json(
      { message: "Số điện thoại là bắt buộc" },
      { status: 400 }
    );
  }
  if (!body.email?.trim()) {
    return NextResponse.json(
      { message: "Email là bắt buộc" },
      { status: 400 }
    );
  }

  // contactName → website, needs → facebook (temp mapping; migrate schema next sprint)
  const dealer = await prisma.dealer.create({
    data: {
      website: body.contactName.trim(),
      companyName: body.companyName.trim(),
      phone: body.phone.trim(),
      email: body.email.trim(),
      city: body.city?.trim() || null,
      facebook: body.needs?.trim() || null,
    },
  });

  return NextResponse.json(dealer, { status: 201 });
}
