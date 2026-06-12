import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── POST /api/dealer-leads (public) ─────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, message: "Request body missing." },
      { status: 400 }
    );
  }

  const raw = body as Record<string, unknown>;

  const contactName = typeof raw.contactName === "string" ? raw.contactName.trim() : "";
  const phone = typeof raw.phone === "string" ? raw.phone.trim() : "";
  const companyName = typeof raw.companyName === "string" ? raw.companyName.trim() : undefined;
  const email = typeof raw.email === "string" ? raw.email.trim() : undefined;
  const city = typeof raw.city === "string" ? raw.city.trim() : undefined;
  const message = typeof raw.message === "string" ? raw.message.trim() : undefined;
  const source = typeof raw.source === "string" ? raw.source.trim() : "WEBSITE";

  // Required field validation
  if (!contactName) {
    return NextResponse.json(
      { success: false, message: "Vui lòng nhập họ tên người liên hệ." },
      { status: 400 }
    );
  }
  if (!phone) {
    return NextResponse.json(
      { success: false, message: "Vui lòng nhập số điện thoại." },
      { status: 400 }
    );
  }

  // Length validation
  if (phone.length > 30) {
    return NextResponse.json(
      { success: false, message: "Số điện thoại không hợp lệ." },
      { status: 400 }
    );
  }
  if (email && email.length > 255) {
    return NextResponse.json(
      { success: false, message: "Email không hợp lệ." },
      { status: 400 }
    );
  }
  if (message && message.length > 2000) {
    return NextResponse.json(
      { success: false, message: "Nội dung tin nhắn quá dài (tối đa 2000 ký tự)." },
      { status: 400 }
    );
  }

  try {
    await prisma.dealerLead.create({
      data: {
        contactName,
        phone,
        companyName: companyName || null,
        email: email || null,
        city: city || null,
        message: message || null,
        source,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/dealer-leads] DB error:", err);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}

// ─── GET /api/dealer-leads (admin) ───────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const skip = (page - 1) * limit;

  try {
    const [leads, total] = await Promise.all([
      prisma.dealerLead.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.dealerLead.count(),
    ]);

    return NextResponse.json({ leads, total, page, limit });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[GET /api/dealer-leads] Prisma error:", err.code);
    }
    return NextResponse.json(
      { success: false, message: "Không thể tải dữ liệu." },
      { status: 500 }
    );
  }
}
